# Operations

## Local

1. `npm install`; copy `.env.example` to `.env` and set URLs consistently (use `localhost` or `127.0.0.1`, not both).
2. `npx tsx server/index.ts` starts API/worker on 3001; `npm run dev` starts UI on 5173.
3. `/workspace` creates a server-backed account; `/app` remains the isolated browser demo. No credentials are needed for local persistence, auth, or the development inbound simulator. Missing AI is an explicit review state.
4. Without `DATABASE_URL`, local PGlite stores Postgres data in `.data/postgres`; preserve `.data/encryption.key`. This is a single-process developer database, never the production fallback.
5. `npm run load` measures the inbound path against a running API; the method, the ceiling and the measured baseline live in [LOAD-LAB.md](LOAD-LAB.md).
6. `npm run check:prisma` proves `prisma/schema.prisma` still matches the SQL migrations. It needs an empty database and is not part of `npm test`; see [../scripts/prisma/README.md](../scripts/prisma/README.md).

## Live Integration

- Set `OPENAI_API_KEY` and `OPENAI_MODEL`. Customer text, business context, and lead memory are sent to OpenAI with `store:false`; assess provider retention and your DPA separately. No tools or arbitrary fetches are available to the model.
- Instagram: configure `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`; register `API_PUBLIC_URL/api/integrations/instagram/callback`; use Business Login with `instagram_business_basic,instagram_business_manage_messages`. Set webhook callback `/api/webhooks/instagram`. Owner authorizes access; token refresh is scheduled daily when expiry approaches.
- WhatsApp: configure `META_APP_SECRET` and the verify token. Subscribe the eligible WABA to message webhooks at `/api/webhooks/whatsapp`. Owner enters a verified phone-number ID and system-user token; tokens are encrypted server-side. Embedded Signup is not implemented; manual Meta setup is required.
- Webhook GET echoes `hub.challenge` only for the configured verify token. POST requires raw-body HMAC-SHA256. Data is committed before ACK; duplicates are suppressed. Only text replies are supported; inbound media requires human review.
- Both channels use a conservative 24-hour reply window. No template or Human Agent exceptions are claimed. Provider acceptance is not delivery; WhatsApp delivery statuses reconcile asynchronously.
- Stripe: set secret/webhook keys and four recurring price IDs matching the displayed Starter/Growth monthly/yearly prices. Subscribe `/api/webhooks/stripe` to Checkout completion, subscription changes, invoice success/failure. Configure Customer Portal. Entitlements follow verified events and freshly retrieved subscription truth, never the redirect.
- SMTP: configure host/port/user/password and verified `MAIL_FROM`; test verification/recovery deliverability. Production registration requires mail configuration; live connection requires verified email.

## Production Surface

**Health and readiness are different questions.** `/api/health` is liveness — the process is up.
`/api/ready` is readiness — the database is reachable *and* the job worker is polling. Use
`/api/health` for a restart probe and `/api/ready` for a load-balancer readiness probe and for
the container healthcheck. The image healthcheck follows `PORT`, so it does not report healthy on
a port the process is not serving.

**Image.** The `Dockerfile` is a two-stage build: the client is bundled with Vite and the server is
bundled with esbuild to `build-server/index.mjs`, then only `dist/`, the server bundle and
`server/migrations/` are copied into a slim runtime image that runs as the non-root `node` user.
Migrations are shipped as files and applied forward-only at boot.

**Graceful drain.** `SIGTERM`/`SIGINT` stops the maintenance timer, signals the event stream, stops
the worker (finishing or releasing the job it holds), closes all open connections, and only then
closes the database. `compose.yaml` gives the app `stop_grace_period: 45s` because the default 10s
window is shorter than a worst-case AI timeout plus the connection drain. Do not shorten it.

**Backup and restore.** `scripts/backup.sh [dir]` writes a timestamped `pg_dump --clean --if-exists
--no-owner --no-privileges` archive (gzipped) plus a `.sha256` sidecar under `backups/` (gitignored).
`scripts/restore.sh <archive>` stops the app, restores into the running database, and starts the app
again. **A restore is destructive and overwrites the current database** — rehearse it against an
isolated staging database first, never production, and verify the `.sha256` sidecar before
restoring. Back up the encryption key separately through the secret manager; it is not in the dump.

**Release.** CI builds the image, smoke-tests it against a real Postgres service, records the
immutable image id and the commit, and exports the image as a 30-day artifact. Deployment stays
manual: load the artifact on the host, tag it, and run the runbook below. No automatic deployment
is configured, and the `production` environment approval is the owner's.

## Release Gate

Run `node scripts/check.mjs` and `npx playwright test`. CI also exercises external Postgres. Require PR review for auth, tenant queries, billing, secrets, prompts, and automation policy; protect `main` and require approval on the `production` environment. CI configuration is supplied, not proof it has run remotely.

### Rehearsal Evidence

What has actually been run, and what has not. Everything in the "not verified" list below needs a
real deployment host and the owner's credentials; no local run substitutes for it.

| Check | Status | Evidence |
|---|---|---|
| Production image builds and boots against real Postgres 17 | **Verified** | `docker compose up -d --build` built the image and booted the stack; `/api/ready` returned `{"status":"ready","service":"dmcloser","storage":"postgres","worker":"polling"}` and `/api/health` returned `{"status":"ok",...,"storage":"postgres"}` against the compose `postgres:17-alpine` service. The probe ran from inside the app container: on this host the Docker daemon is in a separate network namespace, so a published port is not reachable from the shell. |
| Migrations apply forward-only in the production image | **Verified** | `schema_migrations` contained versions 1, 2, 3 and 4 after first boot of the image against an empty database, and held the same four versions after a restore. |
| Registration refuses to run without mail delivery | **Verified** | `POST /api/auth/register` returned `503 {"error":"Registration is temporarily unavailable until email delivery is configured."}`. This is the correct behaviour with SMTP unset, not a defect. |
| Container healthcheck reports the running port | **Verified** | The healthcheck hard-coded `3001` while the container ran on another port and reported `unhealthy`; it now reads `process.env.PORT`. The compose stack reported `dmcloser-app-1 running (healthy)`. |
| Docker compose stack on the deployment host | **Verified on this development host only** | `docker compose up -d --build` was run here: the app and database came up healthy, migrations 1–4 applied, `/api/ready` reported ready, and `POST /api/auth/register` returned 503 with SMTP unset. The stack has **not** been run on the target deployment host, and the credentials used here were generated for the rehearsal only. |
| Restore rehearsal from a `scripts/backup.sh` archive | **Verified** | `scripts/backup.sh` wrote a gzipped `pg_dump` archive plus a `.sha256` sidecar under `backups/`, and `sha256sum -c` verified it. A marker row was inserted into `users` **after** the backup; `scripts/restore.sh` restored the archive over the live database and the marker row was gone afterwards (`count = 0`), with migrations 1–4 intact and the app reporting ready again. The rehearsed database was a fresh compose Postgres, not a production-shaped dataset with real volume. |
| Multi-instance deployment | **Supported** | Postgres rate limiting (`rate_limits` table), Postgres `LISTEN`/`NOTIFY` SSE fan-out, and `FOR UPDATE SKIP LOCKED` job leasing ensure multi-instance safety. |

### Revenue Increment

Numbered SQL migrations run once, transactionally, under a migration-table lock. `002_revenue.sql` is additive, `003_sector.sql` widens the industry constraint and adds the custom-field preset column, and `004_ai_quality.sql` adds the prompt-version, eval-case and eval-run tables. Rehearse a version-one upgrade in staging before release. Keep the existing app and data; rollback to the previous app leaves the additive tables in place. Never drop receipt/outcome tables to roll back a UI release.

Revenue/Brain views and the collapsed deal panel are live-workspace additions; the offline demo and existing inbox/settings are unchanged. Owner-confirmed sales receipts are distinct from Stripe SaaS billing. Supported monetary currencies use two decimal minor units; no FX conversion is performed. Outcomes and financial events require explicit human confirmation, and final outcomes cannot currently be corrected in place. Establish a correction/voiding policy before using these records as accounting evidence.

Clinical-content detection in Medical Clinics mode routes administrative-risk cases to human review before an external AI call when recognized. Detection is conservative English-pattern coverage, not a compliance or medical-classification guarantee. Do not collect clinical records in this sales product without a separate approved privacy/security design.

Follow-up jobs use the existing worker but only produce a due human reminder, never an outbound message. Changed conversation anchors, closed deals and escalations cancel reminders. Internal appointments lock workspace/resources to prevent overlap and export ICS; they do not reserve Google/Microsoft calendar availability. Knowledge approval is owner-controlled; changes, expiry and graph updates invalidate older auto-send context. Score/forecast/learning changes require prospective pilot evals and owner review before expanding automation.

Deploy API/worker instances behind TLS and load balancer. Configure production `DATABASE_URL`, 64-hex-character `ENCRYPTION_KEY`, HTTPS `APP_URL/API_PUBLIC_URL`, and internal `METRICS_TOKEN`. Do not configure `VITE_API_URL` in a same-origin production build. Set `TRUST_PROXY_HOPS` only to your actual proxy depth. Rate limiting is shared across instances using Postgres storage when `DATABASE_URL` is set (with an in-memory fallback for PGlite local dev). Real-time SSE updates fan out across instances using Postgres `LISTEN`/`NOTIFY` pub/sub.

`docker compose up --build -d` requires `.env` (see `.env.example`), `POSTGRES_PASSWORD` and the secrets above. Compose reads `.env` for interpolation, so `POSTGRES_PASSWORD` and `ENCRYPTION_KEY` can live there or be exported by the shell; compose fails fast with a named error if either is missing.

The image runs with `NODE_ENV=production`, and production config refuses to boot unless `DATABASE_URL` is set and `APP_URL`/`API_PUBLIC_URL` are `https://`. A purely local rehearsal therefore still has to write `https://localhost:<port>`; `http://` exits immediately with `Production requires DATABASE_URL and HTTPS APP_URL/API_PUBLIC_URL`. That guard is deliberate — do not weaken it to make a local run convenient. The image and the whole compose stack have now been built, booted, probed and restored from backup on a development host (see Rehearsal Evidence); the **compose stack has not been run on the deployment host** and must be, before traffic. The current migration is additive. Never put `.env`, `.data`, access tokens, exports or production customer data in build context, artifacts, or model prompts.

Before real customer traffic: configure SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`) or nobody can sign up at all — in production `POST /api/auth/register` returns **503 "Registration is temporarily unavailable until email delivery is configured"** while no mailer exists (`server/app.ts:553`). Verified on the compose stack 2026-10-23: 503 without SMTP, 201 with SMTP pointed at a local sink. Complete Meta app review (including registration of the implemented signed deauthorization/data-deletion callbacks), legal/privacy/retention review, pen test, live-model calibration, provider sandbox end-to-end tests, and p95/load measurement. Self-reported model confidence is not calibrated assurance. Neither a sub-two-second reply nor a sub-two-minute account connection has been verified with live credentials.

## Delivery Failure

1. Read Settings > Activity or the conversation's provider status. Server logs contain IDs, paths, status and timing, not message bodies or credentials.
2. Rate limits with known rejection retry with bounded backoff. A timeout/ambiguous acceptance becomes `uncertain`: never blindly resend. Owner checks the actual provider inbox and explicitly records sent/not-sent before retry.
3. Stale replies, spam, risk, expired windows, disabled switches, drafts, human hold, invalid credentials and expired entitlements block automation. New contacts default to manual approval.
4. Failed AI jobs retain the message and allow manual replies; fix configuration and retry from Activity. Durable leases recover interrupted work; interrupted sends become uncertain.

## Observe And Restore

- Health: `/api/health`. Internal aggregate metrics: `/internal/metrics` with `Authorization: Bearer $METRICS_TOKEN`; never expose this token to the browser.
- `MONITOR_API_URL=... METRICS_TOKEN=... node scripts/monitor.mjs` checks dead jobs, queue age >60s, and AI p95 >2s (at least 20 samples). Breaches create `incidents/*-intent.md` for owner triage; no deployment is triggered. Schedule this externally and alert on exit 2/unavailability.
- Back up managed Postgres plus the encryption key through your secret manager. Use provider PITR or `scripts/backup.sh`, which writes a checksummed `pg_dump` archive under `backups/`. Encrypt off-site backups, set retention, and rehearse restoring with `scripts/restore.sh` (or `pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" backup.dump`) into an isolated staging database. Never overwrite production during a rehearsal. The restore path has been rehearsed end to end against a fresh compose Postgres (backup, checksum, marker row, restore, marker gone — see Rehearsal Evidence); a restore of a production-shaped dataset, with a separately held encryption key and off-site retention, is still untested — treat the first such restore as untested until it is.
- Rollback: stop new sends (disable auto-reply and pause worker), retain queued records, select the previous approved image, migrate only if backward-compatible, run health/auth/ingestion smoke tests, then re-enable after owner approval. Reconcile every `sending/uncertain` record first. Backups, PITR and rollback are procedures, not verified infrastructure here.
- Workspace export excludes credentials and CSRF. Deletion cancels an active subscription before deleting workspace rows. Processed webhook/job payloads are scrubbed; pending channel receipts are redacted on erasure. Receipt IDs expire after seven days when no processing job depends on them. Audit and off-site backup retention still need a jurisdiction-specific policy before public launch. Members' independent accounts are not deleted when an owner's workspace is removed.
