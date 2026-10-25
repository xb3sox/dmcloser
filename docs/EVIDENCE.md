# DMCloser Evidence Ledger

This document is the **single authoritative source** for all test counts, gate results, and rehearsal evidence in DMCloser. Any claim without a corresponding row in this table is unverified.

Rows are append-only in meaning: a re-run adds a dated row, it does not rewrite an older
result. `Unverified` means nobody has run the check or produced the artifact; it is never a
synonym for "probably fine".

## Local product gate

Run from a clean `main` working tree on the date shown. `node scripts/check.mjs` runs these
in order in separate processes.

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
| Server Test Suite Total (PGlite local) | `npx tsx --test server/tests/*.test.ts` | 2026-10-25 | 85/85 pass | `server/tests/*.test.ts` | Automated (`scripts/check.mjs`) |
| Control Bands Test Suite | `node --test scripts/control-bands.test.mjs` | 2026-10-25 | 4/4 pass | `scripts/control-bands.test.mjs` | Automated (`scripts/check.mjs`) |
| Playwright Browser Test Suite | `npx playwright test` | 2026-10-25 | 66/66 pass (58 pre-existing + 8 Arabic/RTL) | `tests/*.spec.ts` | Automated (`playwright`, chromium-headless-shell 156) |
| Production Frontend Build | `npm run build` | 2026-10-25 | pass (751.95 kB single-file bundle, 211.99 kB gzip) | `dist/index.html` | Automated (`vite build`) |
| Dependency Security Audit | `npm audit --audit-level=moderate` | 2026-10-25 | 0 vulnerabilities | `package-lock.json` | Automated (`npm audit`) |
| Forward Migrations Apply On An Empty Database | `npx tsx --test server/tests/*.test.ts` (test bootstrap applies every migration once, in order, under the migration lock) | 2026-10-25 | pass (migrations `001`–`007`) | `server/migrations/` | Automated (`server/db.ts`) |

## Hosted CI

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Product Gates Workflow (Postgres 17, Playwright, docker build + readiness smoke) | GitHub Actions `ci.yml`, job `verify` | 2026-10-24 | success | [run 40143930237](https://github.com/xb3sox/dmcloser/actions/runs/40143930237) | CI / External Postgres |
| Security Workflow (gitleaks, trivy fs, semgrep) | GitHub Actions `security.yml` | 2026-10-24 | success | [run 40143930214](https://github.com/xb3sox/dmcloser/actions/runs/40143930214) | CI |
| Schema Parity (Prisma schema vs SQL migrations) | GitHub Actions `ci.yml`, job `schema-parity` | 2026-10-24 | success | same run as Product Gates | CI |

`ci.yml` reports the push it ran for as sha `cb60a1464adf191c6d2d0088f28c30d1a5d33bcc`. That
commit is **not** an ancestor of the current `main` (`039e9dd`) and is absent from the local
object store, which is consistent with a rewrite of `main` and cannot be confirmed without
the reflog on the repository. Treated below as an unverified force-push exposure, not as a
passing control.

## Repository controls

| Claim / Gate | Command | Date | Result | Artifact Path | Verifier |
|---|---|---|---|---|---|
| Dependabot alerts enabled | `gh api repos/xb3sox/dmcloser/vulnerability-alerts` | 2026-10-25 | enabled (0 open alerts) | repository settings | `@xb3sox` session, admin API |
| Dependabot security updates enabled | `gh api repos/xb3sox/dmcloser/automated-security-fixes` | 2026-10-25 | `{"enabled":true}` | repository settings | `@xb3sox` session, admin API |
| Dependabot version updates configured | `.github/dependabot.yml` | 2026-10-24 | configured (npm weekly, actions monthly) | `.github/dependabot.yml` | Static |
| Branch protection / rulesets on `main` | `gh api repos/xb3sox/dmcloser/branches/main/protection` | 2026-10-25 | **Unverified** — HTTP 403, "Upgrade to GitHub Pro or make this repository public" | N/A | Blocked by plan; tracked in #41 |
| Required status checks block merge | N/A | 2026-10-25 | **Unverified** — no required checks are enforceable without protection | N/A | Blocked by plan; `merge-gate.yml` is advisory |
| Secret scanning and push protection | `gh api repos/xb3sox/dmcloser/secret-scanning/alerts` | 2026-10-25 | **Unverified** — HTTP 404, disabled and not available on the current plan | N/A | Blocked by plan |
| Code scanning (CodeQL) | `gh api repos/xb3sox/dmcloser/code-scanning/alerts` | 2026-10-25 | **Unverified** — HTTP 403, not enabled | N/A | Blocked by plan |
| Deployment environment and required reviewer | `gh api repos/xb3sox/dmcloser/environments` | 2026-10-25 | **Unverified** — 0 environments configured | N/A | Blocked by plan; tracked in #41 |
| No force-push to `main` | repository run history vs local objects | 2026-10-25 | **Unverified** — CI push run names a `main` sha absent from history | `ci.yml` run above | Needs owner confirmation; tracked in #41 |

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
