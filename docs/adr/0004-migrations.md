# ADR-0004: Forward-Only SQL Migrations with Statement Splitting

## Status
Accepted

## Context
DMCloser requires deterministic schema evolution across local development (PGlite) and production (PostgreSQL). Migration execution must be atomic, idempotent, safe against concurrent application boots, and simple to audit.

## Decision
We implemented a forward-only, file-based SQL migration runner in `server/db.ts`:
- **Numbered SQL Files:** Sequential SQL files in `server/migrations/` (`001.sql`, `002_revenue.sql`, `003_sector.sql`, `004_ai_quality.sql`).
- **Exclusive Lock:** Migrations run inside a transaction with `LOCK TABLE schema_migrations IN EXCLUSIVE MODE` to prevent concurrent boot races across application instances.
- **Statement Splitting Rule:** Files are split on `;` delimiters and executed sequentially.
- **Strict Formatting Directive:** Statements must never contain a `;` inside a statement body (e.g. no `DO $$ ... $$` procedural blocks) as the splitter would break statement boundaries.
- **Forward-Only Strategy:** Schema rollbacks are explicitly prohibited; schema corrections require creating a new forward migration.

## Alternatives Considered
- **Prisma / Drizzle ORM Migrations:** Evaluated ORM schema migration tools. Rejected to eliminate build-step codegen overhead, binary generator dependencies, schema synchronization bugs, and abstraction layers over plain SQL.
- **Flyway / Liquibase:** Rejected as unnecessary Java/external dependencies for a straightforward Node.js service.

## Consequences
- **Positive:** Migrations execute instantly at application boot without external CLI tools. SQL queries remain 100% transparent and standard DDL.
- **Negative:** Developers must strictly observe the rule against procedural SQL blocks containing semicolons within migration scripts.
