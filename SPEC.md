# DMCloser Specification Index

**This file is an index, not a contract.** The contracts are:

| Artifact | Authority | Status |
|---|---|---|
| `intent.md` | Why the product exists and what it must never do. | Shipped |
| `spec.md` | The implementation contract — UI surfaces, API shape, storage, messaging, AI, delivery, accounts, release. | Shipped, authoritative |
| `plan.md` | The build plan the shipped implementation followed. | Shipped |
| `ROADMAP.md` | Implementation status and the ordered launch gates. | Shipped, authoritative |
| `AGENTS.md` | Agent instructions, conventions, hard rules, gates. | Shipped, authoritative |
| `DESIGN.md` | Locked brand and identity contract. | Shipped, authoritative |
| `docs/ARCHITECTURE.md` | How the system is actually built. | Shipped |
| `docs/REVENUE_OS.md` | The Revenue OS increment contract. | Shipped, authoritative |
| `docs/API.md` | HTTP API reference. | Shipped |
| `docs/OPERATIONS.md` | Runbook. | Shipped |
| `docs/REVIEW.md` | Release review. | Shipped |
| `docs/PRD.md` | **Upstream proposal** — 20 feature cards, `FR`/`NFR`/`AC` identifiers. | Proposal; see status column below |
| `docs/TECH.md`, `docs/BRIEF.md`, `docs/BUSINESS.md`, `docs/DESIGN.md` | **Upstream proposal.** `docs/DESIGN.md`'s colour palette is **rejected**; see root `DESIGN.md` §2.5. | Proposal |

**Important:** `docs/PRD.md` was written against an **uninspected** repository. It describes a
product to be built, not the product that exists. The table below maps each upstream
requirement to what the code actually does, so the two can be diffed without re-reading
both.

Status values: **Implemented** · **Partial** · **Deferred** · **Proposal only**.

---

## Features (FEAT-001 … FEAT-020)

| ID | Feature | Status | Evidence |
|---|---|---|---|
| FEAT-001 | Business signup and workspace | **Implemented** | `POST /api/auth/register` (`server/app.ts:518`), `POST /api/workspaces/switch` (`:720`); `server/tests/product.test.ts` signup cases |
| FEAT-002 | Inbox and conversation detail | **Implemented** | `GET /api/bootstrap` (`server/app.ts:703`), `src/components/InboxView.tsx`, `src/components/ChatView.tsx`; browser specs `tests/workspace.spec.ts` |
| FEAT-003 | Meta connection wizard | **Partial** | `server/providers.ts`, `server/app.ts:1015`/`:1052` (connect flows), `src/components/workspace/AccountSettings.tsx`. **Deferred:** live Meta OAuth callback — needs Meta app approval and credentials. |
| FEAT-004 | Webhook ingestion | **Implemented** | `POST /api/webhooks/:platform` (`server/app.ts:150`), HMAC raw-body verification, `webhook_receipts` dedupe, `jobs` table (`server/migrations/001.sql:14-15`) |
| FEAT-005 | Business Brain | **Implemented** | `brain_entries` / `brain_links` (`002_revenue.sql:3-4`), `GET/POST/PATCH /api/brain*` (`server/revenue-routes.ts:54-134`), `src/components/revenue/BusinessBrain.tsx` |
| FEAT-006 | Lead profile and score | **Implemented** | `scoreLead()` (`src/domain/revenue.ts:59`), `deals.qualification` BANT jsonb, `src/components/revenue/DealPanel.tsx` |
| FEAT-007 | AI suggested reply | **Implemented** | `server/ai.ts` `createAI()` / `guardReply()`; strict JSON schema, grounding check at `server/ai.ts:60-66` |
| FEAT-008 | Approval and takeover | **Implemented** | `autoAllowed()` (`server/service.ts:762`), `POST /api/conversations/:id/hold` (`server/app.ts:911`), `POST /api/deals/:id/escalation` (`server/revenue-routes.ts:473`) |
| FEAT-009 | Next best action | **Implemented** | `SalesInsight.nextAction` in `src/domain/revenue.ts`; surfaced in the inbox and the deal panel |
| FEAT-010 | Search, filters and status | **Partial** | Channel, intent, unread, and free-text search exist (`src/components/InboxView.tsx:8-12`). **Deferred:** lead-status filter, time-range filter, assignee filter (no `assignee` column exists in any migration), and cursor pagination (`server/service.ts:181` `LIMIT 200`). |
| FEAT-011 | Follow-up scheduler | **Implemented** (review-only) | `sales_tasks` (`002_revenue.sql:13`), `POST /api/deals/:id/follow-ups` (`server/revenue-routes.ts:384`), `POST /api/sales-tasks/:id/use` (`:423`). Tasks are human reminders; they never auto-send. |
| FEAT-012 | Bookings and appointments | **Partial** | `appointments` table + conflict check + ICS export (`server/revenue-routes.ts:285-383`). **Deferred:** external calendar sync (explicitly out of scope per `docs/REVENUE_OS.md`). |
| FEAT-013 | Deal and outcome ledger | **Implemented** | `deals` / `deal_outcomes` / `revenue_events` (`002_revenue.sql:5,8,9`), `POST /api/deals/:id/outcome` (`server/revenue-routes.ts:173`), `POST /api/deals/:id/revenue` (`:198`) |
| FEAT-014 | Recovery list | **Partial** | The 7-day "no customer response" risk is computed in `src/domain/revenue.ts:187` and shown per deal. **Deferred:** a ranked, dismissible recovery list endpoint + view. |
| FEAT-015 | Analytics dashboard | **Partial** | `GET /api/revenue` (`server/revenue-routes.ts:136`), `src/components/revenue/RevenueView.tsx`. Totals are shown, but not yet split into separately labelled **Potential / Attributed / Verified** blocks with evidence links and reversal status. |
| FEAT-016 | Sector configuration | **Partial** | Five fixed industry modes + `industryGuidance` (`src/domain/revenue.ts:10`), `business_profiles.industry` CHECK (`002_revenue.sql:1`), `src/components/revenue/BusinessBrain.tsx:283-293`. **Deferred:** `custom` sector with user-defined field presets — the CHECK constraint is closed at six values. |
| FEAT-017 | AI Quality Lab | **Deferred** | Deterministic safety evals exist only as a test (`server/tests/product.test.ts:731`). **Deferred:** prompt-version registry, persisted eval cases, publish gate, owner-only publish, nav surface. |
| FEAT-018 | Cost and consent controls | **Implemented** | `usage` table with `ai_replies` cap (`001.sql:17`), conversation limit → 429 (`server/service.ts:510-515`), opt-out blocks auto-send, `GET /api/operations` (`:1370`) |
| FEAT-019 | Billing and subscription | **Implemented** | `server/billing.ts`, `POST /api/billing/checkout` / `/portal` (`server/app.ts:1108`, `:1127`), signed idempotent Stripe events, `billing` job kind (`server/worker.ts:80`) |
| FEAT-020 | Data export and deletion | **Implemented** | `GET /api/workspace/export` (`server/app.ts:1225`), `DELETE /api/workspace` (`:1265`), `deletion_requests` (`001.sql:19`), `GET /api/data-deletion/:code` (`:340`) |

## Functional requirements (FR-001 … FR-020)

Each `FR-nnn` is the requirement line of its `FEAT-nnn` card (`docs/PRD.md`). The status is
the FEAT status above; the detailed acceptance criteria live in `docs/PRD.md` §Functional
Requirements and §Acceptance Criteria.

FR-001 Implemented · FR-002 Implemented · FR-003 Partial · FR-004 Implemented ·
FR-005 Implemented · FR-006 Implemented · FR-007 Implemented · FR-008 Implemented ·
FR-009 Implemented · FR-010 Partial · FR-011 Implemented · FR-012 Partial ·
FR-013 Implemented · FR-014 Partial · FR-015 Partial · FR-016 Partial · FR-017 Deferred ·
FR-018 Implemented · FR-019 Implemented · FR-020 Implemented

## Non-functional requirements (NFR-001 … NFR-012)

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| NFR-001 | Cross-workspace isolation | **Implemented** | Every query is workspace-scoped; `server/tests/product.test.ts` cross-tenant cases; `server/service.ts` derives the tenant from the session |
| NFR-002 | Signed webhook dedupe, one message per external key | **Implemented** | `webhook_receipts` + `messages UNIQUE (connection_id, provider_id)` (`001.sql:9,14`) |
| NFR-003 | Unknown status never shows delivered; failed send shows reason | **Implemented** | `messages.status` state machine, `POST /api/messages/:id/resolve` (`server/app.ts:984`) |
| NFR-004 | Audit entries for human outbound, AI suggestion, knowledge update | **Implemented** | `audit_events` (`001.sql:18`), `deal_events` (`002_revenue.sql:7`) |
| NFR-005 | No horizontal scrolling at 360px | **Implemented** | `tests/workspace.spec.ts` mobile viewport assertions + axe matrix |
| NFR-006 | **English/Arabic LTR/RTL, locale-aware dates, legible currency/phones** | **Partial — the gap** | Today the interface is **English-only**: zero Arabic characters, no `lang=`/`dir=` attributes, 50 physical CSS properties awaiting logical-property conversion. Server-side guard matching is now bilingual (`src/domain/safety.ts`), so the *safety* half of NFR-006 is closed ahead of the UI half. |
| NFR-007 | No secrets, raw bodies, or sensitive ids in errors/analytics | **Implemented** | `server/app.ts` error mapper; `scripts/control-bands.mjs`; `server/tests/product.test.ts` error-shape cases |
| NFR-008 | No paid AI call beyond the tenant cap | **Implemented** | `usage` cap in the same statement as the increment (`server/service.ts:522-530`); cap exhaustion blocks inference |
| NFR-009 | p95 inbox open ≤2s for 100 conversations | **Not verified** | A release **target**, not a measured claim. Requires a load test in staging. No local gate can prove it. |
| NFR-010 | Send-time recheck of role, opt-out, window, provider state | **Implemented** | `autoAllowed()` (`server/service.ts:762`) re-reads opt-out, risk, escalation, draft, hold, window, and knowledge fingerprint at send time |
| NFR-011 | Backup restore is tenant-safe; revocation secrets not restored | **Not verified** | Requires a production Postgres, a restore rehearsal, and owner sign-off. `docs/OPERATIONS.md` holds the runbook. |
| NFR-012 | WCAG 2.2 AA, keyboard, focus visibility, text resize, contrast | **Implemented** | `@axe-core/playwright` matrix in all four spec files, light and dark. **One defect found and fixed in this pass:** the landing page hard-coded a focus ring of `#7ea870` (2.62:1, FAIL); it now uses `#527347` (≥4.61:1 on every landing background). |

## Acceptance criteria (AC-021 … AC-027)

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| AC-021 / NFR-001 | Two workspaces with identical external contact ids stay isolated | **Implemented** | `server/tests/product.test.ts` cross-tenant fixtures |
| AC-022 / NFR-002 | Replay the same signed event 100× → one logical message | **Implemented** | `webhook_receipts` + unique provider id; `server/tests/product.test.ts` |
| AC-025 / FR-011, NFR-010 | No follow-up after opt-out, outside the window, or under wrong permissions | **Implemented** | `server/tests/revenue.test.ts:589` (English opt-out) and the new Arabic opt-out regression; `autoAllowed()` |
| AC-026 / NFR-005, NFR-012 | Keyboard-only completion; **Arabic RTL layout without clipping** | **Partial** | Keyboard path is covered by the browser suite. The **Arabic RTL half is not implemented** — it is the Phase 2 deliverable, and it needs native-speaker review of the customer-facing wording. |
| AC-027 / NFR-008 | Exhausted cap blocks the next inference and allows a manual response | **Implemented** | `usage` cap (`server/service.ts:522`); the manual composer path is unconditional |

---

## The gaps that remain

Ordered by what unblocks the most. Each one is specced in the approved plan; none is
started.

| # | Gap | Why it matters | Size |
|---|---|---|---|
| 1 | **Arabic / RTL interface** (NFR-006, AC-026) | The differentiator the whole product is built on, and the upstream NFR marked MUST. | Large — 465 UI strings, 50 physical CSS properties, a new locale context, a font stack, and a boot script to prevent a first-paint flip. |
| 2 | **AI Quality Lab** (FEAT-017) | Without a prompt-version registry and a publish gate, a prompt change can silently degrade safety. | Medium — one migration, one job kind, one owner-gated view. |
| 3 | **Custom sector** (FEAT-016) | "All sectors selectable from day one" is an upstream P0. The CHECK constraint currently allows six. | Medium — one migration, two `Record<Industry, …>` maps, one editor. |
| 4 | **Potential / Attributed / Verified blocks** (FEAT-015) | Upstream DESIGN.md requires three separately labelled blocks; today the totals are three unlabelled-ish figures. | Medium — the data exists; the presentation does not. |
| 5 | **Cursor pagination** (FEAT-010, NFR-002 failure path) | A large inbox silently truncates at 200 conversations. | Small — the ordering is already `(last_at DESC, id DESC)`. |
| 6 | **Lead-status and time filters** (FEAT-010) | Cheap once pagination lands. | Small. |
| 7 | **Recovery list** (FEAT-014) | The staleness risk is already computed but never surfaced as a ranked list. | Small. |
| 8 | **Assignee filter** (FEAT-010) | **Deliberately deferred.** No `assignee` column exists in any migration, and conversation assignment is a separate feature that touches the team/roles model. It will not be invented. | Not scoped. |

## Known limits of the current implementation

- **Arabic dialect and transliterated Arabic are not covered** by the safety guard set
  ("la tab3ath liya rasayel" is not detected as an opt-out). This is a known limit of the
  pattern set, recorded in the code, and the reason the Arabic UI needs native review.
- **Grounding is English-shaped.** An Arabic draft grounded against English business facts
  fails the verbatim evidence check in `server/ai.ts:60-66` and therefore stays in review.
  That is the safe behaviour; it must be documented in the workspace, not worked around by
  loosening grounding.
- **The demo is credential-free and local** (`/app`, `localStorage`). It never simulates a
  live send.
- **No live integration, latency SLO, backup, or compliance claim is verified locally.**
  The gates in `intent.md` and `ROADMAP.md` remain open.
