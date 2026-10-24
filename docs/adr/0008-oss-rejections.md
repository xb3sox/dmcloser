# ADR-0008: Evaluation and Rejection of External Open Source Software (OSS) Components

## Status
Accepted

## Context
During initial strategy discussions (documented in `AI-Native Build Guide.md`), a wide range of popular open-source platforms and libraries were considered to accelerate DMCloser development. However, an in-depth evaluation revealed that adopting these OSS frameworks directly would introduce significant architectural mismatches, security vulnerabilities, unneeded complexity, and dependency bloat.

To prevent future re-evaluation or accidental porting/adoption by AI coding agents or human contributors, this ADR formally documents the evaluation and rejection of each shortlisted OSS component and explicitly names the bespoke/built-in component in DMCloser that replaces it.

## Decision
We formally rejected the following nine OSS components and replaced them with lightweight, domain-optimized, built-in implementations:

### 1. Chatwoot
- **Replaced Component:** DMCloser Multi-Tenant Sales Inbox (`src/components/workspace/`, `server/app.ts`, `server/providers.ts`).
- **Reason for Rejection:** Chatwoot is built in Ruby on Rails and is designed primarily for customer support ticketing rather than AI sales qualification and revenue conversion. Adapting Chatwoot's heavy support-centric schema (tickets, agent routing) would require extensive refactoring and introduce massive runtime overhead compared to DMCloser's streamlined, lead-centric Express + React inbox architecture.

### 2. Twenty
- **Replaced Component:** DMCloser Revenue OS & Pipeline Engine (`server/revenue.ts`, `server/migrations/002_revenue.sql`).
- **Reason for Rejection:** Twenty is an open-source CRM with complex GraphQL schemas and heavy NestJS/Microservices abstractions. DMCloser requires lightweight, workspace-scoped opportunity tracking directly tied to messaging threads and AI qualification states, which is cleanly handled by our 11 Revenue OS PostgreSQL tables.

### 3. Corteza
- **Replaced Component:** DMCloser Sector Profile & Custom Field Engine (`server/migrations/003_sector.sql`, `src/domain/sector.ts`).
- **Reason for Rejection:** Corteza provides generic low-code enterprise workflow and record management. Its generalized architecture adds immense database complexity. DMCloser handles sector-specific customization via lightweight JSONB field presets and fixed BANT qualification shapes in native PostgreSQL.

### 4. Activepieces
- **Replaced Component:** DMCloser Automation Safety Gate (`autoAllowed()` in `server/service.ts`).
- **Reason for Rejection:** Activepieces is a visual automation workflow engine. Relying on an external visual workflow execution engine for critical automated sends introduces unpredictable side effects and breaks DMCloser's hard safety invariant: automated replies must pass a single, deterministic server-side gate checking grounding, opt-outs, holds, and clinical risks at send time.

### 5. Novu
- **Replaced Component:** DMCloser Server-Sent Events (SSE) & Notification Engine (`GET /api/events` in `server/app.ts`).
- **Reason for Rejection:** Novu is a multi-channel notification infrastructure platform requiring a separate backend service, Redis, and database. DMCloser's real-time workspace updates require only simple, single-directional SSE invalidation events managed in-memory by Express.

### 6. Better Auth
- **Replaced Component:** DMCloser Native Auth & Session Manager (`server/security.ts`).
- **Reason for Rejection:** Better Auth introduces external framework abstractions, database adapters, and middleware complexity. DMCloser requires direct control over scrypt password hashing, SHA-256 session tokens, single-use recovery keys, CSRF headers, and strict server-derived workspace isolation without ORM/middleware abstractions.

### 7. Drizzle ORM
- **Replaced Component:** DMCloser Native PostgreSQL Driver & Forward-Only SQL Migrations (`server/db.ts`, `server/migrations/`).
- **Reason for Rejection:** Drizzle ORM requires code generation steps, schema file synchronization, and query abstraction layers.DMCloser uses plain, explicit SQL with standard `pg` / `@electric-sql/pglite` drivers, ensuring 100% transparent query execution, workspace scoping verification, and zero build codegen overhead.

### 8. pg-boss
- **Replaced Component:** DMCloser Durable Job Worker (`server/worker.ts`, `jobs` table).
- **Reason for Rejection:** While pg-boss is a capable Node.js job queue, adopting it adds external library lock-in and API surface. DMCloser's requirements are satisfied by an elegant 150-line SQL worker using native PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` with explicit lease expiration, exponential backoff, and dead-lettering.

### 9. Vercel AI SDK
- **Replaced Component:** DMCloser Grounded AI Reply Engine (`server/ai.ts`).
- **Reason for Rejection:** Vercel AI SDK introduces abstraction layers designed primarily for streaming chat UIs and Vercel serverless deployments. DMCloser requires server-only OpenAI Responses API integration with strict JSON schema enforcement (`z.toJSONSchema`), strict grounding citation checks, and deterministic confidence calculation, which operate cleanest with direct, unabstracted provider calls.

## Alternatives Considered
- **Direct adoption of the full open-source stack:** Evaluated stitching together Chatwoot, Twenty, Activepieces, Novu, and Drizzle as proposed in early drafts. Rejected because the combined maintenance, dependency vulnerability exposure, and memory/process footprint far exceeded the budget for a lean, highly reliable product.

## Consequences
- **Positive:** Zero risk of an agent or human contributor importing heavy, rejected third-party libraries. Minimal node_modules footprint, faster cold boot times, zero dependency bloat, and total transparency of business logic.
- **Negative:** DMCloser engineering maintains full responsibility for all built-in components (inbox, auth, queue, i18n, revenue engine, and AI guards).
