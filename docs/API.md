# API Contract

Base `/api`; JSON; opaque HTTP-only session cookie; mutations require exact allowed `Origin` and `X-CSRF-Token` from `/session` or `/bootstrap`. Password registration/login/recovery use origin checks and dedicated rate limits. Provider hooks use signatures instead. The session supplies the tenant for data operations; switching requires verified membership.

| Domain      | Endpoints                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth        | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/recover`, `/auth/reset`, `/auth/verify`, `/auth/verify-email`, `/auth/password`; `GET /session`, `/workspaces`; `POST /workspaces/switch`        |
| Inbox       | `GET /bootstrap`, `/events` (SSE); `PATCH /conversations/:id`; `PUT /conversations/:id/draft`; `POST /conversations/:id/hold`, `/generate`, `/messages`                                                       |
| Delivery    | `POST /messages/:id/retry`, `/resolve` (owner; explicit provider check)                                                                                                                                       |
| Business    | `PATCH /settings` (owner)                                                                                                                                                                                     |
| Connections | `POST /integrations/instagram/start`, `/integrations/whatsapp`; `DELETE /integrations/:platform`; `GET /integrations/instagram/callback`; signed `POST /integrations/instagram/data-deletion`, `/deauthorize` |
| Billing     | `POST /billing/checkout`, `/billing/portal` (owner)                                                                                                                                                           |
| Team        | `POST /team/invites`, `/team/accept`; `DELETE /team/:userId`                                                                                                                                                  |
| Data        | `GET /workspace/export`; `DELETE /workspace` with password (owner)                                                                                                                                            |
| Reliability | `GET /health`, `/operations`; `POST /operations/:id/retry` (owner)                                                                                                                                            |
| Providers   | `GET/POST /webhooks/instagram`, `/webhooks/whatsapp`; `POST /webhooks/stripe`                                                                                                                                 |
| Local only  | `POST /development/inbound` (owner; unavailable in production)                                                                                                                                                |

`POST /conversations/:id/messages`: `{text, sourceId?}` plus `Idempotency-Key` (16-128 chars). Returns `202 {id,status}` after the outbox commit, not after provider delivery. Retrying the same request must reuse the key and text. Instagram limit: 1000 UTF-8 bytes; WhatsApp: 4096 characters.

`PATCH /conversations/:id`: `{notes?,status?,autoSend?,unread?}`. `PUT .../draft`: `{text}`; nonempty drafts and an editing hold pause automation across sessions. `POST .../hold` renews a 45-second lease. A browser error never turns a failed send into a displayed success.

Snapshots return up to 200 most-recent conversations, up to 100 messages per conversation, server suggestions, role, redacted connection status, entitlements and usage. `GET /bootstrap` returns that first page plus a `nextCursor` token; `GET /conversations?cursor=<token>` returns the next page. The token is opaque and tenant-bound. Owner export reads the complete workspace independently of UI limits.

Errors: `{error,requestId}`. `400` validation, `401` session/signature, `403` origin/CSRF/role, `404` not found in this tenant, `409` stale/conflict/window, `429` quota/rate limit, `503` unconfigured service. Tokens and provider response bodies are never returned.

## Additive Revenue APIs

All use the existing session, origin/CSRF gates and server-derived tenant. Knowledge/profile/received-money changes are owner-only; members can maintain opportunities and review sales tasks.

| Domain           | Endpoints                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business Brain   | `GET /brain`; `PATCH /brain/profile` (`industry` — including `custom` — `defaultCurrency`, `sectorFields`); `POST /brain/entries`; `PATCH/DELETE /brain/entries/:id`; `POST /brain/links`; `DELETE /brain/links/:id` |
| Revenue          | `GET /revenue?currency=USD`; selected currency only, UTC month and 30-day forecast horizon                                                                                          |
| Opportunity      | `GET /conversations/:id/deal`; `PATCH /deals/:id` with current `version`                                                                                                            |
| Closed outcomes  | `POST /deals/:id/outcome` with `version,outcome,reason,note?`; immutable, never inferred from text                                                                                  |
| Receipts/refunds | `POST /deals/:id/revenue` with `kind,amountMinor,reference,occurredAt,confirmed:true` + `Idempotency-Key`; owner-only, won opportunities only                                       |
| Quotes           | `POST /deals/:id/quotes` with approved `{entryId,quantity}` lines and `validDays` + idempotency key; `PATCH /quotes/:id` accepted/rejected                                          |
| Appointments     | `POST /deals/:id/appointments` with title/resource/start/end + idempotency key; `PATCH /appointments/:id` cancel; `GET /appointments/:id/calendar` returns ICS file content as JSON |
| Follow-ups       | `POST /deals/:id/follow-ups` with `dueAt,text` + idempotency key; `PATCH /sales-tasks/:id` done/cancel; `POST /sales-tasks/:id/use` writes an empty current user's draft only       |
| Escalation       | `POST /deals/:id/escalation` with `enabled,reason`; never re-enables auto-send on resolution                                                                                        |
| Reply learning   | `POST /messages/:id/feedback` helpful/unhelpful; requires a provider-accepted outgoing message                                                                                      |
| Recovery        | `GET /revenue/recovery` (stale open opportunities ranked by days without a customer reply, each with a reason, a next safe action and an indicative value); `POST /revenue/recovery/:dealId/dismiss` with `reason`; `POST /revenue/recovery/:dealId/restore` |

Amounts are non-negative integer minor units; payment/refund amounts must be positive. USD/EUR/GBP/CAD/AUD supported; no FX conversion. Null amount/date/qualification remains unknown. BANT is explicitly team-confirmed; text signals are citations, not verified budget/authority.

Follow-up jobs produce human reminders only, cancel on changed message anchors/closure/escalation, and do not bypass provider reply windows. Booking is internal, serialized per workspace/resource to prevent overlap; no external calendar acceptance is claimed. Concurrent edits require a current version; final outcomes reject rewrites. Full workspace export includes new commercial/knowledge records independently of UI limits.

The recovery list is a **human worklist**. It never sends, never drafts and never escalates on its own; dismissing an entry records the operator's reason in the audit log and can be undone with `restore`. A custom sector's `sectorFields` are additional to the fixed BANT qualification shape, and they never alter the scored pipeline.

## AI Quality Lab APIs

Owner-only. A workspace's prompt is a versioned record, and publishing one is an owner decision. A workspace with no version keeps the built-in prompt and its existing behaviour.

| Endpoint | Purpose |
| --- | --- |
| `GET /quality` | Versions, eval cases and recent runs for the workspace. |
| `POST /quality/versions` | Create a draft version, seeded from the published version or the built-in default. |
| `PATCH /quality/versions/:id` | Edit a draft version's instructions. |
| `POST /quality/versions/:id/publish` | Publish a version. Refused while a blocking case has failed. |
| `POST /quality/versions/:id/run` | Enqueue an `ai-eval` job. |
| `POST /quality/cases` | Create an eval case. |
| `PATCH /quality/cases/:id` | Update a case, including `enabled`. |
| `DELETE /quality/cases/:id` | Delete a case. |

**A failing blocking case blocks.** A version whose blocking eval case failed is marked `blocked`, and `autoAllowed()` refuses to auto-send for that workspace. A failing **non-blocking** case is recorded and does not block. The lab never sends anything: it evaluates, it records, and it gates.
