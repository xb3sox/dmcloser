# DMCloser Roadmap

**Status:** functional full stack; production launch requires approval.
**Method:** [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).

## Implemented

- **Plan/Design:** `intent.md`, `spec.md`, `plan.md`, `CLAUDE.md`; reviewable scope, architecture and safety rules.
- **Build:** landing/demo; authenticated inbox; Postgres; SSE; durable jobs; grounded AI; Meta adapters; lead memory/drafts; team/roles; billing; recovery; export/erasure.
- **Test:** API/security/evals on PGlite and PostgreSQL; browser/accessibility, type/build and dependency gates.
- **Deploy/Maintain:** Docker/CI; human release gate; health/metrics, failure review, monitor-to-incident loop; recovery runbook.

## Bilingual, Quality and Scale Increment

- **Bilingual safety:** one shared matcher (`src/domain/safety.ts`) normalizes orthographic variants and detects spam, injection, secret, refund, opt-out and clinical content in **English and Arabic**. It is the single source for every call site — auto-send, escalation, the AI reply guard and the revenue guards. A false opt-out kills a lead, so the pattern set is validated against a no-false-positive table.
- **Arabic / RTL interface:** English and Arabic with a real RTL layout — a locale context, a boot script that prevents a first-paint flip, CSS logical properties instead of an override sheet, locale-aware dates and currency, bidi isolation for money and reference IDs, and a language switch in the workspace chrome. English stays the default locale.
- **AI Quality Lab:** the prompt a workspace runs is a versioned, owner-published record. Evaluation cases are the owner's own, de-identified records. A failing **blocking** case marks the version blocked and stops automatic sends at the server boundary. The lab never sends anything.
- **Custom sector:** `custom` is a first-class industry mode with owner-defined field presets. The fixed BANT qualification shape and the scored pipeline are unchanged; custom fields are additional.
- **Revenue blocks:** **Potential**, **Attributed** and **Verified** are three separately labelled blocks. Verified revenue is owner-confirmed receipts net of refunds, with the reference and the reversal status on every line. Potential is an estimate and is never presented as cash.
- **Recovery list:** stale open opportunities, ranked by days without a customer reply, each with a reason and a next safe action. It is a human worklist — dismissible with a reason, restorable, and never automatic.
- **Scale:** cursor pagination on the inbox snapshot, lead-status and time-range filters, plus conversation assignment and the **assignee** filter (`005_assignee.sql`).

## Revenue OS Increment

- **P0 Revenue:** currency-specific confirmed receipts/refunds, won/open values, dated weighted forecast, first-touch channel/team-entered campaign attribution, win/loss reasons.
- **P1 Conversion:** versioned lead scores, explicit BANT, cited buying/objection signals, hot leads, risks and one next-best action in the existing inbox.
- **P2 Knowledge/Retention:** approved versioned Business Brain, five industry modes, knowledge relationships, existing contact memory plus outcome/reply-feedback sales memory.
- **P3 Workflows:** catalog-price quotes, conflict-checked internal appointments/ICS, durable review-only follow-up reminders, human escalation, opt-in qualification/proposal stage assistance.
- **P4 Learning:** repeated-loss recommendations and sufficient-sample smoothed stage rates; no silent knowledge approval, prompt changes, causal claims or automatic model training.

Exact gaps, revenue rationale, DB/API/AI/UI contracts and implementation order: `docs/REVENUE_OS.md`. Migration: `server/migrations/002_revenue.sql`. Existing functionality is retained.

## Launch Gates, In Order

1. **Platform:** provision Postgres/TLS, encryption key, SMTP and OpenAI; verify recovery and backups.
2. **Messaging:** obtain Meta approval; configure OAuth/callbacks and WhatsApp credentials/webhooks; prove inbound-to-confirmed-delivery.
3. **Billing:** configure matching Stripe prices/Portal; verify signed events, cancellation and entitlements.
4. **Quality:** review live-model evals; calibrate automation; measure reply p95 <2s and eligible-account setup <2min; security/privacy sign-off.
5. **Release:** run hosted CI, staging load/restore/rollback drills; assign on-call; obtain owner approval; start a limited pilot.

## After Pilot

Calibrated conversion/time-to-close models; processor-verified sales payments; external calendars; real campaign ingestion; multilingual semantic signals; consented outbound follow-up sequences; outcome correction/voiding; conversation assignment and an assignee filter; WhatsApp Embedded Signup; policy-approved templates/media; shared limiting/pub-sub before horizontal scale.

**Evidence boundary:** local tests do not verify live credentials, approvals, latency targets, legal compliance, hosted CI, Docker deployment or production recovery. Details: `docs/OPERATIONS.md`, `docs/REVIEW.md`.
