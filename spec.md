# DMCloser Implementation Contract

Source: [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook). Artifacts stay beside code; human approval is required for release and policy changes.

- UI: `/` marketing, `/app` isolated browser demo, `/workspace` authenticated product. One shared visual system. No dashboards or silent live fallbacks.
- API: Node/Express, validated REST, same-origin session/CSRF controls, workspace-scoped SQL, SSE invalidations. Production Postgres; filesystem PGlite for local development only.
- Storage: users, sessions, workspaces, connections, conversations/messages, drafts, suggestions, durable jobs, webhook receipts, usage, recovery tokens, audit trail. Tenant IDs are server-derived.
- Messaging: Instagram Business Login; verified WhatsApp Cloud credentials. Tokens encrypted at rest. Validate raw-body HMAC, deduplicate receipts/messages, acknowledge after durable write, process asynchronously. Enforce conservative 24-hour service window and provider text limits. Media is displayed as a review-only placeholder.
- AI: server-only OpenAI Responses + strict schema; business facts, history, and contact memory; spam/injection/refund safeguards; no tool or arbitrary URL execution. Timeout/failure => manual review. Model confidence alone never authorizes sending.
- Delivery: durable outbox; explicit approval; stale-source checks; automation checks both switches, draft/hold, risk, billing, and window. Provider timeout => uncertain, not blind retry. Delivery webhooks distinguish accepted/delivered/read/failed.
- Accounts: scrypt passwords, expiring opaque sessions, single-use email recovery, session revocation, workspace export and deletion. Optional Stripe Checkout/Portal; signed, deduplicated events reconcile current subscription state.
- Release: type checks, deterministic evals, API/security/browser tests, dependency scan, staging smoke/load/restore tests, named owner approval. Health/metrics and failure audit feed new intent; no autonomous production deployment.

## Additive Revenue Contract

- Migration `002`: tenant-scoped business profile/catalog/relationships, one opportunity per conversation, immutable outcome/payment ledgers, quote snapshots, appointments, tasks and reply feedback. Existing tables/data remain intact.
- Scoring: versioned deterministic signals plus explicitly confirmed BANT. Cite customer messages; exclude injection/sensitive data. Value is confirmed or approved-catalog indicative. No made-up budgets, decision-makers or close dates.
- Forecast: selected currency, 30-day UTC horizon, weighted open opportunities with dates and values; exclude unknown/currency-mismatched values. Stage priors are labelled heuristic; outcome cohort rates require sufficient samples and are observational, not causal.
- UI: two optional live-workspace views (Revenue/Business Brain), one collapsed deal panel. Existing demo/landing/inbox behavior remains. Owner controls knowledge, profile and payments; members can maintain deals and tasks.
- Workflows: quote from approved prices; internal appointments with conflict checks/ICS export; scheduled follow-up reminders, never unsolicited auto-sends; human escalation blocks automation; stage automation is opt-in and limited to qualification/quote progress. No payment, external booking, or causal attribution claim without actual evidence.
- Memory: owner-approved business knowledge; existing contact/conversation memory; immutable sales outcomes and reply labels. Learning ranks next actions from historical evidence; it cannot edit approved facts or prompts automatically.
