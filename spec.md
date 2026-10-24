<!-- spec.md — Implementation Contract. For the specification index, see SPEC-INDEX.md. -->

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

## Bilingual, Localized Increment

- **Safety first, in one module.** `src/domain/safety.ts` is pure and shared: opt-out, injection, secret, refund, spam and clinical guards match English and Arabic against normalized text. English patterns stay verbatim; Arabic is added beside them. A guard present in one language and absent in the other is a safety defect. Arabic opt-out must stop auto-send; Arabic clinical content must return 409 with no AI request and no spend.
- **One locale runtime, no library.** `src/i18n/` holds per-surface message maps where every entry carries both `en` and `ar`, so a missing translation is a compile error. `useStrings(surface)` is the only lookup. English stays the default locale and byte-identical to the shipped strings.
- **Direction is a document property.** The interface uses CSS logical properties, so `dir="rtl"` mirrors it with no override sheet. The Arabic typography reset is scoped by `:lang(ar)` — the subject's own language, not the page direction — so negative tracking and uppercase casing never touch Arabic script. Money, reference IDs and opaque codes carry `.ltr-isolate`; numbers stay Western Arabic digits.
- **Server-side money stays `en-US`.** The grounding check matches the model's cited evidence verbatim, so a locale-formatted amount in the approved facts would break it. Only the client's display format is locale-aware.

## AI Quality Lab

- The prompt a workspace runs is a versioned record: `draft` → `published`, or `blocked`. A workspace with no version keeps the built-in prompt.
- Eval cases are owner-authored, curated and de-identified. A failing **blocking** case marks the version `blocked`; a failing non-blocking case is recorded and does not block.
- **A blocked version stops auto-send** at the same server boundary that already enforces opt-out, escalation and hold. Publishing a version is owner-only, and the lab never sends anything: it evaluates, records, and gates.

## Custom Sector

- `business_profiles.industry` accepts `custom`, with a jsonb list of user-defined field presets (label, type, required) edited by the owner.
- Presets are configuration, stored with the approved profile. Custom fields are **additional** to the fixed BANT shape: the deterministic scoring engine still reads BANT only, so a preset can never change the meaning of a score. An unknown value stays unknown.

## Production Surface

- Two-stage image; the runtime stage runs as a non-root user and ships the migrations. `/api/health` is liveness, `/api/ready` is readiness (database reachable **and** worker polling); the container healthcheck follows `PORT`.
- `SIGTERM` drains: maintenance timer, event stream, worker, connections, then the database. The compose stop window is longer than a worst-case AI timeout plus the drain.
- `scripts/backup.sh` writes a checksummed `pg_dump` archive; `scripts/restore.sh` restores it. A restore is destructive and is rehearsed against an isolated database first.
- CI builds the image, smoke-tests it against a real Postgres, records the immutable image id and exports the artifact. **Deployment stays manual and owner-approved.** No local run substitutes for Meta approval, live credentials, a deployment-host rehearsal, a restore rehearsal, a load test, or the privacy review.
