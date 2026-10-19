# DMCloser

An inbox-first sales assistant for Instagram and WhatsApp. React/TypeScript/Vite frontend; Node/Express API; Postgres; durable SQL jobs; OpenAI Responses; Meta messaging; optional Stripe and SMTP.

## Run Locally

```sh
npm install
cp .env.example .env
# Terminal 1
npx tsx server/index.ts
# Terminal 2
npm run dev
```

Use `http://localhost:5173` consistently with `.env`. The API runs on 3001. Local PGlite persists real Postgres data in `.data/postgres`; keep its generated encryption key. No provider credentials are needed to create an account or exercise the development inbound pipeline. Missing AI, payment, or messaging credentials are explicit setup states, not simulated successes.

| Route        | Experience                                              |
| ------------ | ------------------------------------------------------- |
| `/`          | Responsive landing page and interactive product preview |
| `/app`       | Credential-free, isolated browser demo                  |
| `/workspace` | Authenticated, server-backed product                    |

## Product

- One shared minimal light/dark identity, mobile-first navigation, keyboard focus, reduced-motion support.
- Secure registration/login, email verification/recovery, session revocation, workspace isolation, owner/member roles, invites, workspace switching.
- Inbox, intent/status filters, history search, editable contact memory, persistent per-contact drafts, inline reply review/edit/send, realtime SSE updates.
- Official Instagram Business Login and WhatsApp Cloud adapters; encrypted tokens; signed durable webhook ingestion and deduplication.
- Structured AI replies grounded in approved business context; deterministic risk gates; server-enforced opt-ins, confidence, drafts, holds, quota, stale-source checks, and conservative provider windows.
- Durable outbox and delivery receipts; ambiguous delivery is explicitly reconciled by the owner instead of blindly retried.
- Optional Stripe Checkout/Portal, verified subscription entitlements, usage limits, complete data export/deletion, audit/failure review and operational metrics.

## Verify

```sh
node scripts/check.mjs
npx playwright install --with-deps chromium
npx playwright test
# Optional external Postgres verification
TEST_DATABASE_URL=postgres://user:password@localhost/database npx tsx --test --test-concurrency=1 server/tests/product.test.ts server/tests/revenue.test.ts
```

Tests use fake providers for deterministic safety/contracts, not real customer sends or charges. Browser tests start an isolated local backend automatically. Both browser demo and authenticated product are covered. The supplied CI also verifies external Postgres and reserves production release for an approved environment.

## Revenue OS Upgrade

The existing inbox is extended, not replaced. Live workspaces gain **Revenue**, **Business Brain**, and a collapsed **Deal intelligence** panel. These add opportunity values/BANT, explainable scores and next actions, immutable win/loss and receipt ledgers, currency/date-scoped forecasts, approved products/services/FAQs/offers/playbooks, typed knowledge relationships, industry guidance, internal appointments, quote snapshots and durable follow-up reminders.

Receipts are explicitly owner-confirmed, not processor-verified. Forecasts and conversion scores are labelled estimates, not calibrated predictions. Outcome learning updates observed rates and repeated-loss recommendations without changing approved business facts or automation permissions. Follow-ups never send themselves; appointments are internal records with ICS export, not external calendar sync.

`server/db.ts` applies numbered SQL migrations once, in order, under a migration lock. `002_revenue.sql` adds the commercial layer without replacing existing records. Exports include the new records, and existing tenant erasure cascades through them. See [docs/REVENUE_OS.md](docs/REVENUE_OS.md) for the gap analysis, six-part feature contracts, formulas, architecture and exact implementation plan.

## Activate And Operate

- [ROADMAP.md](ROADMAP.md): concise shipped scope, launch order and exact remaining gates.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): credentials, Meta review/webhook setup, Docker, CI, failure recovery, monitoring, backups and rollback.
- [docs/API.md](docs/API.md): REST/auth/idempotency contracts and UI snapshot limits.
- [intent.md](intent.md), [spec.md](spec.md), [plan.md](plan.md), [CLAUDE.md](CLAUDE.md): the [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) applied as reviewable repository artifacts.

Production requires managed Postgres, HTTPS, a stable encryption key, SMTP, approved Meta credentials, OpenAI configuration, and Stripe configuration if charging. Docker/Compose and CI are supplied; hosted deployment, live-provider behavior, model calibration, latency targets, legal review, and recovery rehearsals still require external evidence and owner approval. Do not equate local tests with production certification.

## Source Map

`src/components/landing/` marketing; `src/components/workspace/` authenticated experience; `src/styles/system.css` shared identity; `server/app.ts` REST/security; `server/service.ts` product rules; `server/worker.ts` durable processing; `server/providers.ts` Meta contracts; `server/ai.ts` prompt/schema/evals; `server/migrations/` storage.

The studio photograph was generated for this project. Fonts load from Google Fonts with system fallbacks. Live credentials never enter frontend code or browser local storage.
