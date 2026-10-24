# DMCloser Evidence Ledger

This document is the **single authoritative source** for all test counts, gate results, and rehearsal evidence in DMCloser. Any claim without a corresponding row in this table is unverified.

## Evidence Ledger

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
| Local Compose Stack & Readiness Probe | `docker compose up -d --build` | 2026-10-23 | Verified (development host only) | `compose.yaml` | Local Rehearsal |
| Production Image Forward Migrations | Boot image against empty DB | 2026-10-23 | Verified (applied migrations 1–4) | `server/migrations/` | Local Rehearsal |
| Unconfigured SMTP Registration Gate | `POST /api/auth/register` with SMTP unset | 2026-10-23 | Verified (503 response) | `server/app.ts` | Local Rehearsal |
| Container Healthcheck Probe | Container healthcheck probe following `PORT` | 2026-10-23 | Verified (healthy status reported) | `Dockerfile` | Local Rehearsal |
| Backup & Restore Rehearsal | `scripts/backup.sh` & `scripts/restore.sh` | 2026-10-23 | Verified (gzipped archive + sha256 sidecar, marker row verified removed after restore) | `backups/` | Local Rehearsal |
| Deployment Host Compose Rehearsal | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Production Dataset Restore Rehearsal | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Multi-Instance Deployment | N/A | N/A | **Unverified** (Single instance supported) | N/A | Pending Owner |
| BRNGT LLC Incorporation | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Meta App Approval & Channel Permissions | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Live Provider Credentials (SMTP, OpenAI, Stripe) | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Production Postgres & TLS Infrastructure | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Load Test & Latency Target Verification | N/A | N/A | **Unverified** | N/A | Pending Owner |
| Cross-Border Privacy & Legal Compliance | N/A | N/A | **Unverified** | N/A | Pending Owner |
