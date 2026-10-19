# DMCloser Roadmap

**Status:** functional full stack; production launch requires approval.
**Method:** [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).

## Implemented

- **Plan/Design:** `intent.md`, `spec.md`, `plan.md`, `CLAUDE.md`; reviewable scope, architecture and safety rules.
- **Build:** landing/demo; authenticated inbox; Postgres; SSE; durable jobs; grounded AI; Meta adapters; lead memory/drafts; team/roles; billing; recovery; export/erasure.
- **Test:** API/security/evals on PGlite and PostgreSQL; browser/accessibility, type/build and dependency gates.
- **Deploy/Maintain:** Docker/CI; human release gate; health/metrics, failure review, monitor-to-incident loop; recovery runbook.

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

Calibrated conversion/time-to-close models; processor-verified sales payments; external calendars; real campaign ingestion; multilingual semantic signals; consented outbound follow-up sequences; outcome correction/voiding; pagination; WhatsApp Embedded Signup; policy-approved templates/media; shared limiting/pub-sub before horizontal scale.

**Evidence boundary:** local tests do not verify live credentials, approvals, latency targets, legal compliance, hosted CI, Docker deployment or production recovery. Details: `docs/OPERATIONS.md`, `docs/REVIEW.md`.
