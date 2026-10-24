# ADR-0003: Postgres-Backed Durable Job Queue

## Status
Accepted

## Context
Asynchronous tasks such as Meta webhooks, AI reply generation, delivery dispatch, billing reconciliation, and scheduled follow-ups require reliable processing, concurrency control, exponential retry backoff, and dead-letter handling.

## Decision
We implemented a lightweight, durable job queue directly inside PostgreSQL (`jobs` table) processed by `server/worker.ts`:
- **Atomic Locking:** Workers lease jobs using `SELECT ... FOR UPDATE SKIP LOCKED`, allowing horizontal worker scaling without worker-to-worker lock contention.
- **Lease Expiration:** Processing leases carry a `lease_until` timestamp so crashed worker tasks automatically become available for retry.
- **Retry Policy & Dead-Lettering:** Retries execute with exponential backoff (`min(60000, 2000 * 2^attempts)` ms) and transition to `dead` state after 3 failed attempts. Dead-lettered jobs surface in `GET /api/operations` for manual review and retry.
- **Deduplication & Side-Effect Safety:** External side-effects enforce unique constraints (e.g. `messages` `UNIQUE (connection_id, provider_id)` and `messages_one_reply_per_source`), ensuring retried auto-sends never dispatch duplicate customer messages.

## Alternatives Considered
- **pg-boss / BullMQ / Redis / RabbitMQ:** Evaluated external queue libraries and dedicated queue brokers. Rejected to eliminate additional infrastructure dependencies (like Redis), reduce operational complexity, and keep job scheduling fully transaction-consistent with PostgreSQL data.

## Consequences
- **Positive:** Zero external queue infrastructure required. Work scheduling occurs within standard SQL transactions, guaranteeing that database writes and job dispatches commit atomically.
- **Negative:** Worker process must poll PostgreSQL at fixed intervals (`JOB_POLL_INTERVAL_MS`), creating predictable background SQL read activity.
