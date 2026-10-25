<!-- SPEC-INDEX.md — Specification Index. For the implementation contract, see spec.md. -->

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
| FEAT-010 | Search, filters and status | **Implemented** | Channel, intent, unread, free-text search, **lead-status**, **time-range** and **assignee** filters (`src/components/InboxView.tsx`), **cursor pagination** (`server/service.ts:198-282`; `GET /api/bootstrap` returns the first page and a `nextCursor`, `GET /api/conversations?cursor=` returns the next page) and **conversation assignment** (`server/migrations/007_assignee.sql`: `conversations.assignee_user_id` with an FK to `users`; the filter is applied in `server/service.ts:210-252` and read from `GET /api/conversations?assignee=` at `server/app.ts:764`). Assignment and the filter shipped in #100. **Limit:** the inbox applies the filters in the client over the pages it has loaded (`src/components/InboxView.tsx:66-84`) and does not send them to the API yet (`src/components/workspace/LiveWorkspace.tsx:343,352,381`), so a filter can miss older conversations; tracked in #126. |
| FEAT-011 | Follow-up scheduler | **Implemented** (review-only) | `sales_tasks` (`002_revenue.sql:13`), `POST /api/deals/:id/follow-ups` (`server/revenue-routes.ts:384`), `POST /api/sales-tasks/:id/use` (`:423`). Tasks are human reminders; they never auto-send. |
| FEAT-012 | Bookings and appointments | **Partial** | `appointments` table + conflict check + ICS export (`server/revenue-routes.ts:285-383`). **Deferred:** external calendar sync (explicitly out of scope per `docs/REVENUE_OS.md`). |
| FEAT-013 | Deal and outcome ledger | **Implemented** | `deals` / `deal_outcomes` / `revenue_events` (`002_revenue.sql:5,8,9`), `POST /api/deals/:id/outcome` (`server/revenue-routes.ts:173`), `POST /api/deals/:id/revenue` (`:198`) |
| FEAT-014 | Recovery list | **Implemented** | `GET /api/revenue/recovery` (`server/revenue-routes.ts:166`) → `RevenueService.recovery()` (`server/revenue.ts:940`) ranks stale open opportunities (7+ days without a customer reply) with a reason, a next safe action and an indicative value. `POST …/dismiss` / `POST …/restore` (`:169`, `:181`) record the operator's reason in `audit_events`. Surfaced as a ranked, dismissible section in `src/components/revenue/RevenueView.tsx`; nothing is ever sent automatically. |
| FEAT-015 | Analytics dashboard | **Implemented** | `GET /api/revenue` (`server/revenue-routes.ts:152`) returns three separately labelled blocks — **Verified** (`revenueMinor`, `reversedMinor`, `verifiedReceipts` with per-receipt reference and reversal status), **Potential** (`pipelineMinor`, `forecastMinor`, both marked estimated) and **Attributed** (`attribution[]` grouped by first touch, explicitly descriptive). Rendered in `src/components/revenue/RevenueView.tsx` with the "not cash / not guaranteed / no causal claim" labels the contract requires. |
| FEAT-016 | Sector configuration | **Implemented** | `custom` industry + `business_profiles.sector_fields` jsonb (`server/migrations/003_sector.sql`), `Industry` gains `"custom"` with a generic-guidance entry so no `Record<Industry, …>` map is half-open (`src/domain/revenue.ts:10`, `src/types/revenue.ts:1`), and an owner-gated field-preset editor in `src/components/revenue/BusinessBrain.tsx`. The fixed BANT qualification shape is untouched; custom fields are additional. |
| FEAT-017 | AI Quality Lab | **Implemented** | `ai_prompt_versions` / `ai_eval_cases` / `ai_eval_runs` (`server/migrations/004_ai_quality.sql`), `server/quality.ts` + 8 owner-gated routes (`server/quality-routes.ts`), the `ai-eval` job kind in the durable queue (`server/worker.ts`), and the owner-only view `src/components/revenue/QualityLab.tsx`. A failing **blocking** case marks the version `blocked`, and `autoAllowed()` (`server/service.ts:844`) refuses to auto-send while a workspace's published version is blocked. |
| FEAT-018 | Cost and consent controls | **Implemented** | `usage` table with `ai_replies` cap (`001.sql:17`), conversation limit → 429 (`server/service.ts:510-515`), opt-out blocks auto-send, `GET /api/operations` (`:1370`) |
| FEAT-019 | Billing and subscription | **Implemented** | `server/billing.ts`, `POST /api/billing/checkout` / `/portal` (`server/app.ts:1108`, `:1127`), signed idempotent Stripe events, `billing` job kind (`server/worker.ts:80`) |
| FEAT-020 | Data export and deletion | **Implemented** | `GET /api/workspace/export` (`server/app.ts:1225`), `DELETE /api/workspace` (`:1265`), `deletion_requests` (`001.sql:19`), `GET /api/data-deletion/:code` (`:340`) |

## Functional requirements (FR-001 … FR-020)

Each `FR-nnn` is the requirement line of its `FEAT-nnn` card (`docs/PRD.md`). The status is
the FEAT status above; the detailed acceptance criteria live in `docs/PRD.md` §Functional
Requirements and §Acceptance Criteria.

FR-001 Implemented · FR-002 Implemented · FR-003 Partial · FR-004 Implemented ·
FR-005 Implemented · FR-006 Implemented · FR-007 Implemented · FR-008 Implemented ·
FR-009 Implemented · FR-010 Implemented · FR-011 Implemented · FR-012 Partial ·
FR-013 Implemented · FR-014 Implemented · FR-015 Implemented · FR-016 Implemented ·
FR-017 Implemented · FR-018 Implemented · FR-019 Implemented · FR-020 Implemented

## Non-functional requirements (NFR-001 … NFR-012)

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| NFR-001 | Cross-workspace isolation | **Implemented** | Every query is workspace-scoped; `server/tests/product.test.ts` cross-tenant cases; `server/service.ts` derives the tenant from the session |
| NFR-002 | Signed webhook dedupe, one message per external key | **Implemented** | `webhook_receipts` + `messages UNIQUE (connection_id, provider_id)` (`001.sql:9,14`) |
| NFR-003 | Unknown status never shows delivered; failed send shows reason | **Implemented** | `messages.status` state machine, `POST /api/messages/:id/resolve` (`server/app.ts:984`) |
| NFR-004 | Audit entries for human outbound, AI suggestion, knowledge update | **Implemented** | `audit_events` (`001.sql:18`), `deal_events` (`002_revenue.sql:7`) |
| NFR-005 | No horizontal scrolling at 360px | **Implemented** | `tests/workspace.spec.ts` mobile viewport assertions + axe matrix |
| NFR-006 | **English/Arabic LTR/RTL, locale-aware dates, legible currency/phones** | **Implemented** | `src/context/LocaleContext.tsx` (locale, `dir`, `Intl` formatters, persisted in `localStorage` under `dmcloser-locale`), a boot script in `index.html` that sets `lang`/`dir` before first paint, CSS **logical properties** throughout (`src/styles/system.css`, `src/index.css`) so RTL needs no override sheet, and a per-surface message map under `src/i18n/surfaces/` where every entry carries both locales — a missing translation is a compile error. Money and reference IDs render through `src/components/ui/Money.tsx` and the `.ltr-isolate` utility so a Latin run is not reordered inside Arabic prose. Server-side guard matching is bilingual in `src/domain/safety.ts`. Verified by `tests/arabic.spec.ts` (switch, persistence, no horizontal overflow at 360 px, LTR isolation, axe in Arabic). |
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
| AC-026 / NFR-005, NFR-012 | Keyboard-only completion; **Arabic RTL layout without clipping** | **Implemented** | Keyboard path is covered by the browser suite. The Arabic RTL half is implemented and covered by `tests/arabic.spec.ts`: the switch flips `<html lang dir>`, the layout has no horizontal overflow at 360 px, money and reference IDs stay LTR-isolated, the choice survives a reload, and the axe matrix passes in Arabic. **Residual:** the Arabic customer-facing wording is an engineering artefact and still wants native-speaker review before it is shown to real customers. |
| AC-027 / NFR-008 | Exhausted cap blocks the next inference and allows a manual response | **Implemented** | `usage` cap (`server/service.ts:522`); the manual composer path is unconditional |

---

## The gaps that remain

Ordered by what unblocks the most. Every one of these is an **external** gate: no
local test, no amount of code, and no agent can close them. Only the owner can.

| # | Gap | Why it matters | Who closes it |
|---|---|---|---|
| 1 | **Meta app permission and a live Meta connection** (FEAT-003) | Without the Webhooks permission, inbound Instagram and WhatsApp messages never arrive, and there is no live send path to verify. | Owner — Meta app review + credentials. |
| 2 | **Live SMTP / OpenAI / Stripe credentials** | The AI, the email and the billing paths are all exercised by fakes in the test suite only. | Owner — production accounts. |
| 3 | **Production Postgres, TLS, and a deployment-host rehearsal of the compose stack** | The compose stack has never been run on the deployment host; the local path uses PGlite. | Owner — infra + a rehearsal run. |
| 4 | **Restore rehearsal and a load test** (NFR-009, NFR-011) | `docs/OPERATIONS.md` holds the runbook, but a backup that has never been restored is a hypothesis, and p95 ≤ 2s at 100 conversations is a target, not a measurement. | Owner — a staging rehearsal. |
| 5 | **Cross-border privacy review** | Arabic support does not constitute PDPL or cross-border compliance; that is counsel's determination, not an engineering one. | Owner + counsel. |
| 6 | **Native-speaker review of the Arabic customer-facing wording** | The Arabic phrase set and the interface copy are validated engineering artefacts. The guard set does not cover Arabic dialect or transliterated Arabic. | Owner + a native reviewer. |
| 7 | **External calendar sync, PSP-verified payments, ad ingestion, calibrated models, causal attribution, outcome voiding** | Explicitly out of scope in `docs/REVENUE_OS.md`; each needs a contract with a third party. | Not scoped. |

The former gap 7 (**assignee filter**) is closed, not deferred: it shipped in #100 with
migration `007_assignee.sql`. It is listed under FEAT-010 above, not here.

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
- **Inbox filters are client-side over the loaded pages.** The API supports the same filters
  (including `?assignee=`), but the inbox does not send them yet, so a filtered view can miss
  conversations beyond the loaded page. Tracked in #126.
- **No live integration, latency SLO, backup, or compliance claim is verified locally.**
  The gates in `intent.md` and `ROADMAP.md` remain open.
