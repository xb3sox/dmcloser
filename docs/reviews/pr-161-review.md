# Review — PR #161 `ci: harden CI/CD workflows, rate limits, and verification gates`

- PR: https://github.com/xb3sox/dmcloser/pull/161 — `agent/ci-cd-hardening` → `main`, 15 files, +66/−10, closes #160
- Reviewed commit: `6fb9fa2` (tip of `agent/ci-cd-hardening`), reviewed in a pristine `git worktree`, not the working checkout
- Reviewer stance: expert review across four lenses — application config/security, disaster-recovery shell, GitHub Actions correctness, repo conventions (`AGENTS.md`/`CLAUDE.md`/OCR rules)
- **Verdict: request changes.** The workflow fixes are correct and are a genuine improvement. Two items are release-blocking before this can be called "production-grade hardening", three are medium, the rest are nits. Details and patches below.

## What was actually executed (evidence, not reading)

| Check | Result |
| --- | --- |
| `npm ci` (node v22.22.3) | pass |
| `npx tsc --noEmit` | pass |
| `npx tsc -p tsconfig.server.json` | pass |
| `server/tests/product.test.ts` (34 tests, PGlite) | pass |
| `multi-instance` 4, `quality` 7, `recovery` 6, `revenue` 24, `worker` 4 | all pass |
| `scripts/check-migrations.mjs` | pass (8 files) |
| `scripts/control-bands.test.mjs` | pass |
| `scripts/check-file-case.mjs` (direct) | pass; **silently skips (exit 0, no output) when launched through a symlink** |
| `scripts/prisma/verify-parity.mjs` | fails locally on **both** this branch and `main` (`HARNESS ERROR … reading 'trim'`, exit 2) — pre-existing sandbox/env issue, CI `schema-parity` passes. Not a PR defect |
| Live config + HTTP probes against `loadConfig()` / `createApp()` | see Finding 1 |
| `sha256sum -c` behaviour against a moved archive | see Finding 2 |

## Findings

### 1. [BLOCKER] Rate-limit env values are unvalidated — a typo silently disables auth brute-force protection or takes the API down

`server/config.ts`:

```ts
rateLimitMax: Number(env.RATE_LIMIT_MAX || 300),
authRateLimitMax: Number(env.AUTH_RATE_LIMIT_MAX || env.RATE_LIMIT_MAX || 15),
recoveryRateLimitMax: Number(env.RECOVERY_RATE_LIMIT_MAX || env.RATE_LIMIT_MAX || 5),
```

`express-rate-limit` v8 does **not** throw on `NaN`, `0`, negative, or `Infinity`. Measured on this exact dependency set:

```
limit=5         -> statuses over 40 requests: 200,429
limit=NaN       -> statuses over 40 requests: 200          # limiter never fires
limit=0         -> statuses over 40 requests: 429          # every request blocked
limit=Infinity  -> statuses over 40 requests: 200          # limiter never fires
```

What `loadConfig()` produces (measured):

```
"abc"     -> rate= NaN  auth= NaN  recovery= NaN
"10_000"  -> rate= NaN  auth= NaN  recovery= NaN     # numeric separator, very easy to type
"0"       -> rate= 0    auth= 0    recovery= 0
"-5"      -> rate= -5   auth= -5   recovery= -5
""        -> rate= 300  auth= 15   recovery= 5
"2000"    -> rate= 2000 auth= 2000 recovery= 2000    # see (c)
```

End-to-end against the real app on this branch, `RATE_LIMIT_MAX=abc` (i.e. `NaN` in all three slots):

```
auth/login x40, wrong password every time -> statuses 401      # no 429 anywhere
```

End-to-end with `0`: every request to `/api/auth/login` returns `429` — a total outage from one env character.

This matters because the PR converts hard-coded safety limits into operator-supplied input. Previously the values could not be wrong; now `RATE_LIMIT_MAX=10_000` in a `docker compose` `.env` (the documented deploy path) turns the login limiter off entirely, silently, with the API still healthy. Config values that guard authentication need to fail closed, not fail open.

Suggested fix (a validated helper, plus a hardening test):

```ts
function positiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    // Production surfaces the typo loudly instead of silently disabling a guard.
    if (process.env.NODE_ENV === "production")
      throw new Error(`${name} must be an integer between 1 and 100000.`);
    return fallback;
  }
  return value;
}
```

Notes:
- `Math.max(1, …)` clamping (the pattern already used for `workerConcurrency`) does **not** help here: `Math.max(1, NaN)` is `NaN`.
- (c) `authRateLimitMax` falling back to `RATE_LIMIT_MAX` means an operator who raises the global limit for a load test also loosens login/recovery brute-force protection by the same factor. That is a deliberate-looking fallback, but it should either be dropped (independent defaults) or documented in `docs/OPERATIONS.md` with a warning.
- Add a regression test; there is currently **no** test anywhere in `server/tests` that asserts a `429` (grep for `429` in `server/tests/*.ts` returns nothing).

### 2. [BLOCKER] `scripts/restore.sh` checksum gate breaks the disaster-recovery path it was added for

```sh
if [ -f "$archive.sha256" ]; then
  sha256sum -c "$archive.sha256"
fi
```

`backup.sh` writes `sha256sum "$archive" >"$archive.sha256"`, so the sidecar records the **backup-time path** — normally `backups/dmcloser-<stamp>.sql.gz`, relative to the repo root. `sha256sum -c` resolves the name it reads from that file against the **current** working directory. Reproduced:

```
$ sha256sum backups/dmcloser-20260101T000000Z.sql.gz > backups/dmcloser-20260101T000000Z.sql.gz.sha256
$ cat backups/*.sha256
c582008b…  backups/dmcloser-20260101T000000Z.sql.gz

# DR scenario: archive pulled from off-site storage into another directory
$ cd restore && sha256sum -c dmcloser-20260101T000000Z.sql.gz.sha256
sha256sum: backups/dmcloser-20260101T000000Z.sql.gz: No such file or directory
backups/dmcloser-20260101T000000Z.sql.gz: FAILED open or read
exit=1
```

With `set -euo pipefail` that aborts the restore **before `psql` runs** — on the one path where you cannot afford a spurious failure (copied archive, different host, absolute path, renamed file). The comment on `restore.sh`/`backup.sh` in `docs/OPERATIONS.md` still describes the restore as rehearsed, and the rehearsal used the same relative path from the repo root, so this hole would not have shown up.

Fix: verify the digest against the archive's **actual** path rather than trusting the recorded one, and keep the good pre-stop ordering:

```sh
if [ -f "$archive.sha256" ]; then
  expected=$(awk '{print $1}' "$archive.sha256")
  actual=$(sha256sum "$archive" | awk '{print $1}')
  [ "$expected" = "$actual" ] || { echo "::checksum mismatch for $archive" >&2; exit 1; }
else
  echo "warning: no $archive.sha256; restoring without integrity check" >&2
fi
```

Also: `sha256sum` does not exist on macOS (`shasum -a 256` does). Since this is an operator script meant to run from a laptop as well as CI, a `command -v sha256sum` fallback is cheap.

### 3. [MEDIUM] `restore.sh` trap restarts the app after a *failed* restore, on a half-restored database

```sh
trap 'docker compose start app' EXIT
```

The archive is `pg_dump --clean --if-exists`, so a failed restore can leave the database with tables dropped and only partly recreated. The trap fires on any exit — success, checksum failure, `gunzip` failure, `psql` error — and starts the app against whatever state exists. Two problems: a possibly inconsistent database gets served traffic, and the operator's terminal shows a failed restore but a running app, which reads as "recovered".

```sh
restored=0
trap 'status=$?; if [ "$restored" = 1 ]; then docker compose start app
      else echo "restore FAILED — app left stopped, database may be inconsistent" >&2; fi
      exit $status' EXIT
...
restored=1
```

### 4. [MEDIUM] New operator knobs are undocumented, and one document now contradicts the code

`RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `RECOVERY_RATE_LIMIT_MAX` appear in exactly three places: `server/config.ts`, `server/app.ts`, and `.github/workflows/ci.yml`. They are absent from `.env.example` (which documents every other knob, down to `TRUST_PROXY_HOPS` and `METRICS_TOKEN`) and from `docs/OPERATIONS.md` line 78, which is the operator's only description of rate limiting. Given Finding 1, the docs also need the safe range and a warning that `0`/negative blocks everything and a non-numeric value disables the limiter.

`docs/OPERATIONS.md` line 42/104 also still claims the restore path was "rehearsed end to end … (backup, checksum, marker row, restore, marker gone)" without mentioning that the checksum is now enforced and can abort the run (Finding 2), or that the app is restarted from a trap (Finding 3). A changed operator contract should land with the doc change in the same PR.

### 5. [MEDIUM] No regression test for the new config parsing, and the limiter's blocking path is now unexercised everywhere

The repo rule stated in the OCR review background (`ocr-review.yml`) is "a fix without a regression test is not a fix". Every suite now pins `rateLimitMax: 10000`, and Playwright does the same, so after this PR **no test in the repo ever sees a 429**. The limiter is the only server-enforced protection against credential stuffing, and it currently has zero coverage — including for the invalid-value cases in Finding 1.

Cheapest useful test, self-contained (verified pattern, works in PGlite):

```ts
test("auth rate limit rejects after the configured budget", async () => {
  const cfg = { ...config, authRateLimitMax: 2, rateLimitMax: 10_000, recoveryRateLimitMax: 10_000 };
  const { app } = await createApp(cfg, await createDatabase(cfg));
  for (let i = 0; i < 2; i++)
    await request(app).post("/api/auth/login").set("Origin", cfg.appUrl).send({ email: "a@b.c", password: "x" });
  const blocked = await request(app).post("/api/auth/login").set("Origin", cfg.appUrl).send({ email: "a@b.c", password: "x" });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers["retry-after"]);
});
```

Plus a config test for `abc`, `0`, `-5`, `10_000`, and empty.

### 6. [LOW] `scripts/check-file-case.mjs` self-run guard still fails silently under a symlink

The change fixes the `file://${process.argv[1]}` construction (a real Windows bug), but the equality check remains path-spelling-sensitive. Reproduced on this branch with a fixture repo containing `A.md` and `a.md`:

```
$ node check-file-case.mjs ;                              # direct
Case collisions found in tracked repository files:
  - A.md <-> a.md                                          exit=1   correct

$ node /tmp/colfix-link.mjs ;                             # invoked via symlink
                                                           exit=0   no output — main() never ran
```

A gate that can pass vacuously is worse than no gate. Since `findCaseCollisions` is exported for tests but nothing imports the module for the CLI (only `check.mjs` spawns it), the simplest robust form is to always run, or compare real paths:

```js
import { realpathSync } from "node:fs";
const entry = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (entry && fileURLToPath(import.meta.url) === entry) main();
```

That also covers the Windows case-folding mismatch (`C:\…` vs `c:\…`) that `resolve()` alone does not.

### 7. [LOW] `.github/workflows/ocr-review.yml` — add `persist-credentials: false`

The new checkout runs in a `pull_request_target` workflow whose job holds `pull-requests: write`, and a third-party action executes right after it. Default `persist-credentials: true` writes the token into `.git/config` inside the workspace that action can read. SHA pinning mitigates the risk; not leaving the credential there removes it.

Checking out `github.base_ref` is the correct choice — it means a PR cannot influence `.opencodereview/rule.json` or the review config it is reviewed under. Worth a one-line comment saying so, because the next reader will assume it is a diff-checkout bug.

### 8. [LOW] Two sources of truth for the test rate limits

`ci.yml` exports `RATE_LIMIT_MAX=10000` for the Postgres-adapter step, `playwright.config.ts` exports the same trio, and six test files hard-code the same trio into their `Config` literals. Only the test-file values are actually used by the suites (nothing under `server/tests` calls `loadConfig()`; the CI env vars therefore only matter for the Playwright webServer, which already has them). Pick one mechanism. Keeping the values in the test configs and dropping the `ci.yml` env block is the smaller diff.

### 9. [LOW] `server/tests/product.test.ts` fixture re-applies defaults redundantly

```ts
const cfg = { ...config, authRateLimitMax: 10000, rateLimitMax: 10000, recoveryRateLimitMax: 10000, ...overrides };
```

The three values are already in `config`. The re-application looks like it defends against something, which it does not (and `...overrides` still wins). Drop it and keep `{ ...config, ...overrides }`.

### 10. [NIT] `config.rateLimitMax ?? 300` in `server/app.ts` is unreachable through the type

`Config` declares all three as required `number`, so the `??` never fires in TypeScript-checked code. Either mark them optional (`rateLimitMax?: number`) to match the runtime defence, or drop the `??`. Worth knowing while making the change: if the value ever arrives as `undefined` at the limiter, `express-rate-limit` v8 silently defaults to **5 requests/window** (measured), so a dropped field is its own outage class.

### 11. [NIT] `ci.yml` failure diagnostics

The new readiness block is a real improvement (it converts a silent 60-second no-op into a clear failure). Two small follow-ups: write `docker logs` to `test-results/smoke.log` so the existing `upload-artifact` step captures it, and `docker logs … || true` so the diagnostic step cannot itself abort before `exit 1`.

### 12. [NIT] `main-guard.yml` parent detection is correct; make its failure mode explicit

`git rev-list --parents -n 1 "$SHA" | awk '{print NF - 1}'` correctly yields the parent count (rev-list prints the commit itself, so `NF-1` is right) and the single-parent branch is the actual fix for squash/rebase commits landing on main — good catch. If `$SHA` is ever absent (force-push, run from a deleted ref), the bare assignment aborts the step under `bash -e` with a `rev-list` error rather than a guard message: append `|| { echo "::error::$SHA not found in this clone"; exit 1; }`.

## What is good and should stay

- **`merge-gate.yml`**: removing `--depth=1` on the base fetch is the right fix. A shallow base can lack the merge base, which makes `base...HEAD` (triple-dot) compare against the grafted root and mis-count. Correct root cause, minimal change.
- **`main-guard.yml`**: dynamic parent count genuinely fixes the `-m 1` failure on squash-merged commits, and the amending/issue-reporting flow is untouched.
- **`ci.yml` concurrency**: `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` is correct; main runs now complete so `main-guard` observes a real conclusion instead of a cancellation. A one-line comment explaining the expression would help the next reader.
- **`ci.yml` `release-review: needs: [verify, schema-parity]`**: closes a real hole — a release candidate could be exported while the Prisma/SQL parity gate was red.
- **Readiness assertions in both smoke tests**: previously a failed container produced `readiness:` (empty), an unauthenticated `curl` failure buried in logs, and a confusing error. Explicit `::error::` + logs + `exit 1` is the correct shape.
- **Rate limits moved from magic numbers into typed `Config`** — the direction is right, and every test suite's `Config` literal was updated consistently (tsc proves it).
- **`restore.sh` verifying the checksum before stopping the app**: correct ordering, and skipping when no sidecar exists keeps old archives usable.

## CI reality check

`gh pr checks 161` at review time: `gate`, `ocr`, `secrets`, `static`, `filesystem`, `schema-parity` pass; **`verify` has been `in_progress` for ~30 minutes**, stuck on *"Verify external Postgres adapter"* (`npx tsx --test --test-concurrency=1 server/tests/*.test.ts` with `TEST_DATABASE_URL`), and will hit the job's 35-minute timeout.

This is **not** caused by the PR: on `main` (run `40277105858`, commit `62ac1ff`) the same step ran `05:59:09Z → 06:33:19Z` and was cancelled at the job timeout. So the external-Postgres step is chronically slow/hung in this repo (some suite under `TEST_DATABASE_URL` is presumably not letting the event loop drain, e.g. an open pool or LISTEN client). Consequence for this PR: the body's "Remote CI: `Product Gates` passed" is not reproducible right now, and the one job this PR is mostly about has not gone green. Locally, all six suites pass against PGlite in <15 s each, so the hang is specific to the Postgres adapter path — worth a separate investigation issue before `verify` is treated as a reliable gate.

## Suggested merge conditions

1. Validate the three env values (fail closed; production throws on garbage) **and** add the config + 429 tests. *(Finding 1, 5)*
2. Fix the checksum verification to use the archive's real path; make the trap failure-aware; note the `shasum` fallback. *(Findings 2, 3)*
3. Document the knobs in `.env.example` + `docs/OPERATIONS.md`, and correct the restore narrative. *(Finding 4)*
4. Optional but cheap: `persist-credentials: false` in `ocr-review.yml`, the realpath guard in `check-file-case.mjs`, and the redundant-value cleanup. *(Findings 6–9)*
5. Get `verify` green (or at least confirm the external-Postgres stall is tracked) before merging, since it is the job this PR modifies.
