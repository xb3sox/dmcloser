# ADR-0007: Operational Observability, Health Endpoints, and Control Bands

## Status
Accepted

## Context
DMCloser requires continuous monitoring of system health, queue performance, AI generation latency, error rates, and security boundary violations without introducing heavy external APM agents or metrics collectors.

## Decision
We implemented a self-contained operational monitoring and control band system:
- **Liveness vs. Readiness:** `/api/health` reports process liveness; `/api/ready` reports operational readiness (verifying database connectivity and active worker polling).
- **Control Bands (`scripts/control-bands.mjs`):** Automated statistical assertion rules that evaluate operational metrics, detecting stalled queues, elevated reply latency (p95 > 2s threshold), and unexpected failure bursts.
- **Operations Dashboard API (`/api/operations`):** Owner-accessible endpoint delivering worker queue depth, dead-letter job lists, system memory, error rates, and retry controls.
- **Structured JSON Logging:** Server logs output structured JSON events containing request IDs, HTTP status codes, latency timings, and sanitizing sensitive parameters (redacting passwords, tokens, and customer content).

## Alternatives Considered
- **Datadog / New Relic APM Agents:** Evaluated commercial APM vendors. Rejected to avoid third-party agent overhead, vendor lock-in, data egress costs, and potential leakage of sensitive sales data to external telemetry vendors.
- **Prometheus + Grafana Infrastructure:** Evaluated dedicated metrics infrastructure. Deferred as unnecessary for early-stage operational requirements.

## Consequences
- **Positive:** Zero APM agent overhead or data leakage risk. Operational metrics are checked deterministically during automated gate execution (`node scripts/control-bands.test.mjs`).
- **Negative:** Advanced distributed trace visualization is omitted in favor of structured request log tracing.
