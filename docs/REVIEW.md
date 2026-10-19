# Release Review

Implementation is available for local/staging review. No production authorization, hosted deployment, or provider certification is implied.

## Deterministic Gates

- Strict client/server TypeScript; production frontend build; compiled API smoke test against real Postgres.
- API/security tests on both PGlite and PostgreSQL: tenant isolation, CSRF, sessions, recovery, signatures, OAuth state, dedupe, safe automation, uncertain delivery, durable restart, Stripe reconciliation, complete export and erasure.
- Browser suite: landing/demo regressions plus real registration, server persistence, SSE across tabs, send failure handling, export/deletion and automated light/dark accessibility.
- Control-band tests and dependency audit. See the commands in `README.md`; CI repeats these gates but hosted execution is not verified here.

## Human Gates

- Credentialed OpenAI/Meta/Stripe/SMTP contract and delivery checks. Automated provider tests use fakes; they do not send messages, charge cards, or prove deliverability.
- Model confidence is self-reported, not a calibrated probability. Deterministic safety checks are conservative heuristics, not proof against hallucination. Review real conversation evals before enabling automation.
- UI snapshots intentionally limit conversation/history volume. Full export is independent of those limits; pagination is needed before a large-inbox rollout.
- Single API/worker topology only until shared rate limiting/pub-sub and multi-instance load tests are approved. Local PGlite requires one process per data directory.
- Register the signed Instagram deletion/deauthorization callbacks; review the privacy policy, lawful data processing, retention and automated-experience disclosures.
- Rehearse the supplied Docker deployment and backup/restore/rollback procedures on the actual host. Configure branch protection, production environment approval, metrics scheduling and on-call ownership.

Any failed production control band produces an incident intent and a regression test. Agents may diagnose or propose a PR; only a named owner may authorize deployment or rollback.

## Revenue OS Review Boundary

The extension is additive: migration 002 and a numbered migration runner; Revenue/Brain views plus a collapsed live-chat panel. No existing demo, inbox, integration, billing or authentication flow was replaced. Revenue is owner-confirmed receipts net of refunds, not a payment-provider claim; historical legacy conversation statuses are not retroactive closed-deal revenue. Forecast priors, text-pattern lead scores and observed cohort rates are explicitly uncalibrated.

New regressions cover exact money/unknown values, dated multi-currency formulas, receipt idempotency/refund caps, immutable outcomes/version conflicts, catalog approval/expiry snapshots, tenant/role boundaries, BANT provenance, learning thresholds, appointment conflicts, review-only follow-ups, escalation, Brain prompt grounding, erasure/export and upgrading a version-one database without replacing records. Pilot review must still cover real outcomes, multilingual signal coverage, clinician/privacy boundaries, calibrated prediction quality and legal financial-record retention.

Review also checks frozen editor versions, old-opportunity navigation beyond the recent-thread window, industry-isolated outcome cohorts, atomic empty-draft use, escaped/folded ICS export, refund locking, and model-call avoidance for recognized clinical content. No feature is evidence that a model caused a sale or that a manually recorded receipt has been processor-verified.

### Increment Verification

- 49 API/security tests pass in the PGlite and external PostgreSQL runs, including the migration-upgrade and revenue suites.
- 58 browser tests pass, including preserved landing/demo/inbox flows, Revenue/Brain workflows, concurrent-editor protection and automated light/dark/mobile accessibility checks.
- Two deterministic monitoring tests, strict frontend/backend TypeScript, production frontend build and compiled API bundle pass. Dependency audit reports zero vulnerabilities.
- Populated desktop/mobile Revenue, Brain and deal-panel layouts were reviewed using synthetic local data; no runtime errors or horizontal overflow were observed. These checks do not verify live Meta/OpenAI/payment/calendar services, calibration, legal compliance or hosted deployment.
