# ADR-0001: Core Technology Stack Selection

## Status
Accepted

## Context
DMCloser requires a unified, lightweight, highly reliable technical stack to support a mobile-first AI sales inbox for Instagram and WhatsApp inquiries. The application requires strict data isolation across tenant workspaces, grounded AI reply suggestions, deterministic safety gates, and low runtime overhead.

## Decision
We chose a streamlined modular monolith stack consisting of:
- **Frontend:** React 19, Vite 7, TypeScript 5.9, hand-authored CSS with system design tokens (Tailwind CSS installed for tooling compatibility, but hand-written CSS used for UI styling), Motion 14, and Lucide React icons.
- **Backend:** Node.js with Express 5, `pg` driver for PostgreSQL production databases, `@electric-sql/pglite` for zero-dependency filesystem local development, and `tsx` TypeScript runtime executor.
- **Validation & AI:** Zod schema validation across all trust boundaries; server-only OpenAI Responses API with strict JSON schemas.
- **Testing:** `node:test` runner with `tsx` for backend services and unit/security tests; Playwright with `@axe-core/playwright` for browser, RTL, and accessibility testing.
- **Pure Domain Engine:** Pure TypeScript business domain rules in `src/domain/` shared between frontend client and backend Express server without external runtime dependencies.

## Alternatives Considered
- **Microservices Architecture:** Split messaging, AI generation, and billing into standalone services. Rejected due to operational complexity, deployment overhead, and unnecessary latency between services.
- **Next.js / Full-stack SSR:** Use Next.js for server-rendered pages and API routes. Rejected due to router and middleware churn, complex hydration state management, and bloated server bundle footprints.
- **Heavy Frontend Frameworks / State Libraries (Redux, Zustand, React Router):** Hand-rolled `window.location.pathname` router and React Context were chosen to minimize bundle size (~714 kB single file bundle) and eliminate dependency churn.

## Consequences
- **Positive:** Single-command execution (`node scripts/check.mjs`) verifies all types, unit tests, control bands, and client builds rapidly. Zero-config local development using PGlite without requiring Docker or local Postgres instances.
- **Negative:** Server code must maintain strict boundary separation manually within a single codebase. Multi-region horizontal scaling requires explicit pub/sub adapter implementation for SSE events in the future.
