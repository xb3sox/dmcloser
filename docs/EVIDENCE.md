# DMCloser Evidence Ledger

This document is the **single authoritative source** for all test counts, gate results, and rehearsal evidence in DMCloser. Any claim without a corresponding row in this table is unverified.

Rows are additive: a re-run adds a newer, dated block and the older block stays. A row is
tightened only when it was wrong when written, and such a correction is stated as one.
`Unverified` means nobody has run the check or produced the artifact; it is never a synonym
for "probably fine".

## 2026-10-24 run (previous)

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Client TypeScript Type Check | `npx tsc --noEmit` | 2026-10-24 | pass | `tsconfig.json` | Automated (`scripts/check.mjs`) |
| Server TypeScript Type Check | `npx tsc -p tsconfig.server.json` | 2026-10-24 | pass | `tsconfig.server.json` | Automated (`scripts/check.mjs`) |
| Product Server Test Suite | `npx tsx --test server/tests/product.test.ts` | 2026-10-24 | 30/30 pass | `server/tests/product.test.ts` | Automated (`scripts/check.mjs`) |
| Revenue Server Test Suite | `npx tsx --test server/tests/revenue.test.ts` | 2026-10-24 | 23/23 pass | `server/tests/revenue.test.ts` | Automated (`scripts/check.mjs`) |
| Safety Server Test Suite | `npx tsx --test server/tests/safety.test.ts` | 2026-10-24 | 11/11 pass | `server/tests/safety.test.ts` | Automated (`scripts/check.mjs`) |
| Quality Server Test Suite | `npx tsx --test server/tests/quality.test.ts` | 2026-10-24 | 7/7 pass | `server/tests/quality.test.ts` | Automated (`scripts/check.mjs`) |
| Recovery Server Test Suite | `npx tsx --test server/tests/recovery.test.ts` | 2026-10-24 | 5/5 pass | `server/tests/recovery.test.ts` | Automated (`scripts/check.mjs`) |
| Control Bands Test Suite | `node --test scripts/control-bands.test.mjs` | 2026-10-24 | 2/2 pass | `scripts/control-bands.test.mjs` | Automated (`scripts/check.mjs`) |
| Server Test Suite Total (PGlite local) | `node scripts/check.mjs` | 2026-10-24 | 76/76 pass | `server/tests/*.test.ts` | Automated (`scripts/check.mjs`) |
| Server Test Suite (External Postgres 17) | `TEST_DATABASE_URL=postgres://user:pass@localhost/db npx tsx --test --test-concurrency=1 server/tests/*.test.ts` | 2026-10-24 | 76/76 pass | `server/tests/*.test.ts` | CI / External Postgres |
| Playwright Browser Test Suite | `npx playwright test` | 2026-10-24 | 66/66 pass (58 pre-existing + 8 Arabic/RTL) | `tests/*.spec.ts` | Automated (`playwright`) |
| Production Frontend Build | `npm run build` | 2026-10-24 | pass (721 kB single-file bundle) | `dist/index.html` | Automated (`vite build`) |
| Dependency Security Audit | `npm audit --audit-level=moderate` | 2026-10-24 | 0 vulnerabilities | `package-lock.json` | Automated (`npm audit`) |

## 2026-10-25 run (current)

`node scripts/check.mjs` runs the type checks, every discovered server suite in its own
process, the control-band test, the build and the audit. **Playwright is not part of
`check.mjs`**; it is a separate command and its own row below.

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Client TypeScript Type Check | `npx tsc --noEmit` | 2026-10-25 | pass | `tsconfig.json` | Automated (`scripts/check.mjs`) |
| Server TypeScript Type Check | `npx tsc -p tsconfig.server.json` | 2026-10-25 | pass | `tsconfig.server.json` | Automated (`scripts/check.mjs`) |
| Product Server Test Suite | `npx tsx --test server/tests/product.test.ts` | 2026-10-25 | 33/33 pass | `server/tests/product.test.ts` | Automated (`scripts/check.mjs`) |
| Revenue Server Test Suite | `npx tsx --test server/tests/revenue.test.ts` | 2026-10-25 | 24/24 pass | `server/tests/revenue.test.ts` | Automated (`scripts/check.mjs`) |
| Safety Server Test Suite | `npx tsx --test server/tests/safety.test.ts` | 2026-10-25 | 11/11 pass | `server/tests/safety.test.ts` | Automated (`scripts/check.mjs`) |
| Quality Server Test Suite | `npx tsx --test server/tests/quality.test.ts` | 2026-10-25 | 7/7 pass | `server/tests/quality.test.ts` | Automated (`scripts/check.mjs`) |
| Recovery Server Test Suite | `npx tsx --test server/tests/recovery.test.ts` | 2026-10-25 | 5/5 pass | `server/tests/recovery.test.ts` | Automated (`scripts/check.mjs`) |
| Mail Server Test Suite | `npx tsx --test server/tests/mail.test.ts` | 2026-10-25 | 1/1 pass | `server/tests/mail.test.ts` | Automated (`scripts/check.mjs`) |
| Worker Server Test Suite | `npx tsx --test server/tests/worker.test.ts` | 2026-10-25 | 4/4 pass | `server/tests/worker.test.ts` | Automated (`scripts/check.mjs`) |
| Server Test Suite Total (PGlite local) | `npx tsx --test server/tests/*.test.ts` | 2026-10-25 | 85/85 pass | `server/tests/*.test.ts` | Automated (`scripts/check.mjs`) |
| Server Test Suite Total (Postgres 17, hosted) | GitHub Actions `ci.yml` job `verify`, `TEST_DATABASE_URL` step | 2026-10-24 | 85/85 pass | [run 40143930237](https://github.com/xb3sox/dmcloser/actions/runs/40143930237) | CI / External Postgres |
| Control Bands Test Suite | `node --test scripts/control-bands.test.mjs` | 2026-10-25 | 4/4 pass | `scripts/control-bands.test.mjs` | Automated (`scripts/check.mjs`) |
| Playwright Browser Test Suite | `npx playwright test` | 2026-10-25 | 66/66 pass (58 pre-existing + 8 Arabic/RTL) | `tests/*.spec.ts` | Automated (`playwright`, chromium-headless-shell 156) |
| Production Frontend Build | `npm run build` | 2026-10-25 | pass (751.89 kB single-file bundle, 211.97 kB gzip) | `dist/index.html` | CI (`vite build`, [run 40145194829](https://github.com/xb3sox/dmcloser/actions/runs/40145194829)) |
| Dependency Security Audit | `npm audit --audit-level=moderate` | 2026-10-25 | 0 vulnerabilities | `package-lock.json` | Automated (`npm audit`) |
| Forward Migrations Apply On An Empty Database | test bootstrap applies every migration once, in order, under the migration lock | 2026-10-25 | pass (migrations `001`–`007`) | `server/migrations/` | Automated (`server/db.ts`) |

The local build prints 751.95 kB; the hosted build prints 751.89 kB for the same commit. The
row quotes the hosted figure because that run is linkable. The `2026-10-24` total of 76/76 was
accurate when written; the suite has grown by nine tests since (mail 1, worker 4, and four
added across product/revenue).

## Hosted CI

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Product Gates (Postgres 17, Playwright, docker build + readiness smoke) | GitHub Actions `ci.yml`, job `verify` | 2026-10-24 | success | [run 40143930237](https://github.com/xb3sox/dmcloser/actions/runs/40143930237) | CI |
| Security (gitleaks, trivy fs, semgrep) | GitHub Actions `security.yml` | 2026-10-24 | success | [run 40143930214](https://github.com/xb3sox/dmcloser/actions/runs/40143930214) | CI |
| Schema Parity (Prisma schema vs SQL migrations) | GitHub Actions `ci.yml`, job `schema-parity` | 2026-10-24 | success | same run as Product Gates | CI |

## Repository controls

Verified from an admin session against the live repository, not inferred from a document.

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Dependabot alerts enabled | `gh api repos/xb3sox/dmcloser/vulnerability-alerts` | 2026-10-25 | enabled (HTTP 204); `dependabot/alerts?state=open` returns `[]` | repository settings | Admin API |
| Dependabot security updates enabled | `gh api repos/xb3sox/dmcloser/automated-security-fixes` | 2026-10-25 | `{"enabled":true,"paused":false}` | repository settings | Admin API |
| Dependabot version updates configured | `.github/dependabot.yml` | 2026-10-24 | configured (npm weekly, actions monthly) | `.github/dependabot.yml` | Static |
| Branch protection / rulesets on `main` | `gh api repos/xb3sox/dmcloser/branches/main/protection` | 2026-10-25 | **Unverified** — HTTP 403, "Upgrade to GitHub Pro or make this repository public" | N/A | Blocked by plan; tracked in #41 |
| Required status checks block merge | N/A | 2026-10-25 | **Unverified** — not enforceable without protection | N/A | Blocked by plan |
| Secret scanning and push protection | `gh api repos/xb3sox/dmcloser/secret-scanning/alerts` | 2026-10-25 | **Unverified** — HTTP 404, disabled | N/A | Blocked by plan |
| Code scanning (CodeQL) | `gh api repos/xb3sox/dmcloser/code-scanning/alerts` | 2026-10-25 | **Unverified** — HTTP 403, not enabled | N/A | Blocked by plan |
| Deployment environment and required reviewer | `gh api repos/xb3sox/dmcloser/environments` | 2026-10-25 | **Unverified** — 0 environments configured | N/A | Blocked by plan; tracked in #41 |
| Red-`main` compensating control | `.github/workflows/main-guard.yml` (#114) | 2026-10-25 | configured — reverts a failed Product Gates run on `main` and opens a `type:bug` issue | `.github/workflows/main-guard.yml` | Static |
| Direct-push compensating control | `scripts/git-hooks/pre-push` via `npm run hooks:install` (#114) | 2026-10-25 | configured — refuses `refs/heads/main`; `ALLOW_MAIN_PUSH=1` overrides | `scripts/git-hooks/pre-push` | Static (client-side only) |
| Private vulnerability reporting | `curl -s -i https://api.github.com/repos/xb3sox/dmcloser/private-vulnerability-reporting` | 2026-10-25 | **Unverified / Unavailable** — HTTP 404 Not Found | `SECURITY.md` | Blocked by plan; `SECURITY.md` names `@xb3sox` as sole channel |
| Security mailbox `security@dmcloser.com` | send a test report and wait for a reply | 2026-10-25 | **Unverified / Non-operational** — no receipt proof in repository; removed from `SECURITY.md` active channels | `SECURITY.md` | Pending Owner; tracked in #124 |

## Local rehearsals

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Local Compose Stack & Readiness Probe | `docker compose up -d --build` | 2026-10-23 | Verified (development host only) | `compose.yaml` | Local Rehearsal |
| Production Image Forward Migrations | Boot image against empty DB | 2026-10-23 | Verified (applied migrations 1–4 at that time) | `server/migrations/` | Local Rehearsal |
| Unconfigured SMTP Registration Gate | `POST /api/auth/register` with SMTP unset | 2026-10-23 | Verified (503 response) | `server/app.ts` | Local Rehearsal |
| Container Healthcheck Probe | Container healthcheck probe following `PORT` | 2026-10-23 | Verified (healthy status reported) | `Dockerfile` | Local Rehearsal |
| Backup & Restore Rehearsal | `scripts/backup.sh` & `scripts/restore.sh` | 2026-10-23 | Verified (gzipped archive + sha256 sidecar, marker row verified removed after restore) | `backups/` | Local Rehearsal |
| Deployment Host Compose Rehearsal | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Production Dataset Restore Rehearsal | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Multi-Instance Deployment | N/A | N/A | **Unverified** (Single instance supported) | N/A | Pending Owner |

## External gates

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| BRNGT LLC Incorporation | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Meta App Approval & Channel Permissions | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Live Provider Credentials (SMTP, OpenAI, Stripe) | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Production Postgres & TLS Infrastructure | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Load Test & Latency Target Verification | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Cross-Border Privacy & Legal Compliance | N/A | N/A | **Unverified** | N/A | Pending Owner |
