# Implementation Plan

1. `server/{config,db,security}.ts` + SQL migration: durable storage, secrets, sessions and tenant boundaries. Prove transactions and authentication isolation.
2. `server/{providers,ai,service,worker}.ts`: signed ingestion, guarded generation and durable outbox. Prove dedupe, windows, prompt-injection/unknown-fact handling and uncertain delivery behavior.
3. `server/{app,billing}.ts`: REST/SSE, account lifecycle, connection flows, subscription and usage. Prove CSRF, permissions, idempotency, recovery and billing reconciliation.
4. `src/{lib,components/workspace}`: authenticated workspace using shared inbox/settings; explicit save/send/error states; keep `/app` demo regressions green.
5. `server/tests`, `tests`, CI and runbooks: continuously test; record evidence; update `ROADMAP.md` with exact external gates. Production deployment remains human-gated.

## Revenue OS Increment, In Order

1. Add shared revenue types/rules and numbered migration runner + `002_revenue.sql`; prove upgrade preservation, tenant constraints, integer currency math.
2. Add `server/revenue.ts` and `server/revenue-routes.ts`: profile/Brain, deal/BANT, immutable outcomes/payments, forecast/attribution/learning, quotes/appointments/follow-ups/escalation; audit all mutations and reuse jobs/SSE.
3. Extend existing ingest/generate/outbox boundaries: approved Brain facts + context fingerprint, sales context as untrusted recommendations, escalation and opt-out checks. Never replace the reply pipeline.
4. Add Revenue/Brain views and a collapsed deal panel; expose on live-workspace navigation only. Preserve current screens, test selectors, mobile layout and offline demo.
5. Add deterministic evals, API tests and browser/accessibility checks. Publish `docs/REVENUE_OS.md` with gaps and six-part feature contracts; update concise roadmap and release evidence. Defer external calendars, payment verification and calibrated predictive models to explicit pilot gates.
