# DMCloser Architecture

**What this is:** the actual architecture of the shipped system. Written from the code, not
from a proposal.

**Shape:** a **modular monolith** — one Express process serving the API, one worker process
draining a durable job queue, one PostgreSQL database, one static client bundle. No
microservices, no message broker, no cache tier. The complexity budget is spent on the
automation safety gate, not on distribution.

```
Browser (React 19 / Vite)
  │  session cookie + CSRF header, same-origin
  ▼
Express 5 API  ──►  PostgreSQL  ◄──  Worker process (durable job queue)
  │   │
  │   ├──► SSE /api/events  (invalidation to open tabs)
  │   ├──► OpenAI Responses API (server-only, strict schema)
  │   ├──► Meta Graph API (Instagram Business, WhatsApp Cloud)
  │   └──► Stripe (Checkout / Portal / webhooks)
  ▼
Worker: leases jobs with FOR UPDATE SKIP LOCKED, retries with backoff, dead-letters after 3 attempts
```

---

## 1. Process and deployment topology

| Process | Entry point | Responsibility |
|---|---|---|
| API | `server/index.ts` → `server/app.ts` | HTTP, auth, tenancy, validation, SSE fan-out. |
| Worker | `server/worker.ts` | Drains the `jobs` table: webhook processing, AI generation, delivery, auto-send, billing reconciliation, token refresh, sales tasks. |
| Client | `dist/` served by the API in production | The single-file bundle (Vite `vite-plugin-singlefile`). |

`compose.yaml` and the `Dockerfile` package the two Node processes. The worker is a
**separate process on purpose**: a slow AI call or a provider timeout must never occupy an
HTTP request, and the queue must survive an API restart.

**The image is two-stage.** The client is bundled by Vite and the server is bundled by
esbuild into `build-server/index.mjs`; the runtime stage copies only `dist/`, the server
bundle and `server/migrations/`, and runs as the non-root `node` user. Migrations ship as
files and are applied forward-only at boot.

**Liveness and readiness are separate questions.** `/api/health` answers "is the process
up". `/api/ready` answers "can this instance take traffic" — the database is reachable
**and** the job worker is polling. The container healthcheck uses `/api/ready` and follows
`PORT`, so it never reports healthy on a port the process is not serving.

**Shutdown drains.** `SIGTERM`/`SIGINT` stops the maintenance timer, closes the event
stream, stops the worker (finishing or releasing the job it holds), closes open
connections, and only then closes the database. `compose.yaml` gives the app a 45s
`stop_grace_period` — the default 10s is shorter than a worst-case AI timeout plus the
connection drain.

---

## 2. Persistence

**PostgreSQL is the only production store.** Local development runs
`@electric-sql/pglite` against the filesystem (`server/db.ts`) — same SQL dialect, no
server to install. **PGlite is never used in production.**

### Migrations

`server/db.ts` applies numbered, forward-only SQL files from `server/migrations/`:

```sql
LOCK TABLE schema_migrations IN EXCLUSIVE MODE
-- then: split the file on ";" and run each statement in order
-- then: INSERT INTO schema_migrations(version) ...
```

**The split-on-`;` rule is load-bearing.** A `;` inside a statement body silently splits
it into two broken statements, and a `DO $$ … $$` block is always broken by it. New
migrations therefore use plain DDL only. Files are `001.sql` (core), `002_revenue.sql`
(the Revenue OS increment, 11 tables), `003_sector.sql` (the custom-sector preset
columns) and `004_ai_quality.sql` (prompt versions, eval cases, eval runs). There are no
down-migrations — rolling back means writing a new forward migration.

### Tenancy

`workspace_id` is on every tenant-owned table and appears in **every** query. It is derived
server-side from the session, never read from a request body, query string, or client
header. A missing `workspace_id` predicate is a bug, not a style issue.

### The core tables

`users` · `workspaces` · `members` (owner/member) · `sessions` · `tokens` (recovery) ·
`connections` (Meta accounts, token encrypted at rest) · `conversations` ·
`messages` · `drafts` · `suggestions` · `webhook_receipts` · `jobs` · `usage` ·
`audit_events` · `deletion_requests`

### The Revenue OS tables

`business_profiles` · `brain_entries` · `brain_links` · `deals` · `deal_events` ·
`deal_outcomes` · `revenue_events` · `deal_quotes` · `appointments` · `sales_tasks` ·
`reply_feedback`

**Financial ledgers are append-only.** `revenue_events` carries `client_key` (idempotency)
and a unique `(workspace_id, kind, reference)`. `deal_outcomes` is unique per deal and
stores a `snapshot` of the deal at close. Nothing is updated in place; a correction is a
new event.

---

## 3. The durable job queue

`jobs` is a table, not a broker. `server/worker.ts` leases work with:

```sql
SELECT * FROM jobs
WHERE (state='pending' AND available_at<=$1) OR (state='processing' AND lease_until<$1)
ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED
```

`FOR UPDATE SKIP LOCKED` means two workers never lease the same row — horizontal scale
needs no coordination. The lease (`lease_until`) expires, so a worker that dies mid-job
does not strand it.

**Job kinds:** `webhook` · `generate` · `deliver` · `auto-send` · `billing` ·
`refresh-token` · `sales-task`.

**Failure policy:** a job retries with exponential backoff (`min(60000, 2000 * 2^attempts)`
ms) and is **dead-lettered after 3 attempts**. Dead jobs surface in `GET /api/operations`
with a reason and a manual retry (`POST /api/operations/:id/retry`).

**Side-effect safety.** Every job that produces an external side effect carries a dedupe
key. `messages` has `UNIQUE (connection_id, provider_id)` and
`messages_one_reply_per_source` — one reply per source message, so a retried auto-send
cannot produce a second customer-facing message. Provider timeouts resolve to
**uncertain**, never to a blind retry of a send.

---

## 4. Invalidation: SSE, not websockets

`GET /api/events` (`server/app.ts:781`) is a Server-Sent Events stream. The API keeps an
in-process `EventEmitter`; the client listens and re-fetches the affected slice. SSE
because the traffic is one-directional and it survives ordinary HTTP infrastructure
without a socket upgrade.

**Known limit:** the emitter is in-process, so a multi-instance API would need a shared
pub/sub before horizontal scale. The roadmap defers this explicitly. Single-instance is
correct at the current scale and is the cheaper mistake to un-do later.

---

## 5. Trust zones

Four boundaries. Each one validates. None of them trusts the other side.

| Zone | Enters via | Validation | Notes |
|---|---|---|---|
| **Provider webhook** | `POST /api/webhooks/:platform` | HMAC over the **raw body** (`validMetaSignature`, `server/security.ts:60`), constant-time compare, `webhook_receipts` dedupe, per-platform rate limit | Acked only **after** a durable write. Processing is asynchronous. |
| **Tenant API** | every `/api/*` route | Session cookie + CSRF header, origin check on mutations, role middleware (`owner` / `canConnect`), zod schema validation, workspace scoping | Tenant id is server-derived. |
| **AI provider** | `server/ai.ts` | Strict JSON schema via `z.toJSONSchema` + `strict: true` on the Responses API; the reply is then re-parsed and re-validated | Output is **untrusted**. Grounding, risk, and clinical checks run on it. |
| **Private storage** | `server/security.ts` | `encrypt`/`decrypt` (AES-GCM-style) for provider tokens at rest; `scrypt` password hashing; `equal()` constant-time compare for secrets | The encryption key comes from the environment. Never from the database. |

**Credentials never live in the client.** The client holds a session cookie and nothing
else. Provider tokens, the OpenAI key, and the Stripe secret are server environment
variables.

---

## 6. The automation gate — the most important file in the repo

`autoAllowed()` in `server/service.ts` decides whether an automated message may be sent.
Everything that could send without a human passes through it.

It returns `false` when any of these hold:

1. the deal is **escalated**, or the stage is `won`/`lost`;
2. an inbound message contains an **opt-out**;
3. an inbound message contains **any** detected risk (spam, injection, sensitive);
4. the workspace is a **medical** workspace and an inbound message contains **clinical
   content**;
5. the conversation has an open **draft**;
6. the conversation is on **hold**;
7. the **workspace auto-send switch** or the **conversation auto-send switch** is off;
8. the suggestion is missing, not grounded, or outside the confidence threshold;
9. the **knowledge fingerprint** changed since the suggestion was generated (stale source);
10. the message **window** or **billing** state forbids sending.

The gate is re-evaluated **at send time**, not at generation time, so a change in any of
these between draft and send stops the send. That is the difference between "we checked
once" and "we checked when it mattered."

**Clinical content is escalated before any spend.** `server/service.ts:520-527` returns
`409 "Clinical content requires a qualified human. No AI request was made."` **before** the
usage row is incremented — no provider call, no spend, no token.

**The guard set is bilingual.** `src/domain/safety.ts` is a pure, dependency-free module
shared by the client and the server. It matches English and Arabic opt-out, injection,
secret, refund, spam, and clinical phrases against **normalized** text, using
`\p{L}`-aware word boundaries (JavaScript's `\b` is ASCII-only and never fires next to an
Arabic letter). The server imports it; the client can import it without a second
implementation drifting.

---

## 7. AI generation

`server/ai.ts`.

1. **Context assembly.** Approved business settings + approved Business Brain entries are
   the *only* trusted inputs. Contact notes, generated memory, and historical
   wins/losses are labelled untrusted in the prompt and passed in a separate field.
2. **One call.** `store: false`, `max_output_tokens: 650`, a strict JSON schema
   (`replySchema`: text, intent, confidence, safe, reason, evidence, memory).
3. **Grounding.** Every evidence string must appear **verbatim** in the approved facts, and
   must be longer than 4 characters. Any unknown URL or unknown number in the reply
   fails the check. This is why a reply that invents a price is structurally impossible to
   mark safe.
4. **Risk.** `detectRisk()` runs on the customer's text **and** the model's reply.
5. **Clinical.** In a medical workspace, clinical language in either side fails the reply.
6. **Consequence.** Unsafe ⇒ `safe: false`, confidence clamped to 74, and a human-readable
   reason. A safe reply's confidence is still clamped to 97, because a model estimate is
   not permission.

**Failures never fabricate.** Provider timeout or a non-completed response throws
`AI_INCOMPLETE` / `AI_NOT_CONFIGURED`; the conversation shows an error state and a manual
composer. There is no simulated success.

---

## 8. Client

React 19, Vite 7, TypeScript 5.9. **Tailwind 4 is installed but the UI is hand-written
CSS** — the design system is a set of hand-authored class rules in `src/styles/` and
`src/components/*/*.css`, not utility classes. Adding a utility class to a component is
off-pattern; the tokens are the contract (see root `DESIGN.md`).

- **No router.** `src/App.tsx` switches on `window.location.pathname` for `/`, `/app`,
  and `/workspace`.
- **Three contexts.** `ThemeContext` (light/dark, `localStorage` key `dmcloser-theme`),
  `LocaleContext` (locale + direction, `localStorage` key `dmcloser-locale`) and
  `AppContext` (session, bootstrap payload, live workspace). The theme boot script in
  `index.html` sets the class before first paint, so there is no flash; the locale boot
  script does the same for `lang`/`dir`, so an Arabic first paint is never an LTR paint
  that flips.
- **Three surfaces.** `/` marketing (public), `/app` an isolated browser-only demo backed
  by `localStorage` (no server, no credentials, no real sends), `/workspace` the
  authenticated product.
- **Bundle.** One self-contained HTML file via `vite-plugin-singlefile` (~568 kB). It is
  the marketing page *and* the app — the whole product ships as one document.

### Localization

`src/i18n/` is a typed message directory, not a runtime. Each surface exports a flat map
of `key → { en, ar }`, so a missing Arabic string is a **compile error** rather than a
silent fallback. `useStrings(surface)` in `src/context/LocaleContext.tsx` is the only
lookup; there is no interpolation library and no key registry.

**English is the default locale and stays byte-identical to the shipped strings.** The
browser suite asserts on exact English text, so a translation pass is a substitution, never
a rewrite.

**Direction is a document property, not a stylesheet fork.** Every layout rule uses CSS
logical properties (`padding-inline`, `border-inline-start`, `inset-inline-end`,
`text-align: start`), so `dir="rtl"` mirrors the whole interface with no override sheet.
The only direction-specific CSS is the handful of rules that must be: pointing glyphs, and
the Arabic typography reset.

**The Arabic typography reset is scoped by the subject's language, not the page.**
`:lang(ar)` matches an element only when its *resolved* language is Arabic, so an Arabic
run inside an English page is still corrected, and an English run inside an Arabic page
keeps the design's tracking and casing. The reset sets `letter-spacing: normal` (the
design's negative tracking separates joined Arabic letterforms) and disables
`text-transform: uppercase` (Arabic has no case).

**Numbers stay Western Arabic digits.** `localeTag` pins `ar-SA-u-nu-latn`, matching Saudi
practice. Money, phone numbers, reference IDs and opaque codes carry the `.ltr-isolate`
utility (`direction: ltr; unicode-bidi: isolate`) so they are not reordered inside
Arabic text.

**Server-side money formatting stays `en-US`.** `server/ai.ts` checks the model's cited
evidence against the approved facts with a verbatim substring match, so a locale-formatted
money string in the grounding facts would break the check. Only the client's display
format is locale-aware.

---

## 9. Security posture

- **Sessions** are opaque, hashed at rest, expiring, revocable, and carry a CSRF token.
- **Passwords** are `scrypt`. Provider tokens are encrypted with an environment key.
- **Rate limits** on auth, recovery, and webhooks (`express-rate-limit`).
- **Helmet** sets the security headers; **CORS** is scoped.
- **Errors** are mapped to safe codes (`server/app.ts`); no raw message bodies, secrets, or
  sensitive identifiers reach a client, a log, or an analytics record. `scripts/control-bands.mjs`
  enforces the band.
- **Export and deletion** are owner-only, audited, and reversible only through a
  single-use, expiring code.
- **No production access is ever claimed by a local test.** The gates in `intent.md` —
  Meta approval, real credentials, production Postgres/TLS, privacy review, load test,
  restore rehearsal, owner approval — are open, and no local run can close them.

---

## 10. What is deliberately not here

- **No microservice split.** The boundaries are modules inside one process until there is
  measured evidence for a split.
- **No cache tier.** The read path is fast enough at the current scale, and a cache would
  add a consistency surface to a system whose correctness story is "re-read at the
  boundary".
- **No shared pub/sub for SSE.** Deferred with the horizontal-scale work.
- **No ORM.** Plain SQL with explicit scopes. The queries *are* the tenancy guarantee.
- **No i18n library, no state library, no component library.** 465 UI strings do not need
  a runtime; the repo has no room for a dependency that adds one.
