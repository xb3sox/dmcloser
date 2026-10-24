# Architecture Decision Records (ADRs)

This directory records the key architectural decisions made in the DMCloser repository, including stack selection, infrastructure patterns, OSS evaluations, and boilerplate references.

## Index of ADRs

| ID | Title | Status |
|---|---|---|
| [ADR-0001](0001-stack.md) | Core Technology Stack Selection | Accepted |
| [ADR-0002](0002-auth.md) | Authentication, Session Management, and Workspace Scoping | Accepted |
| [ADR-0003](0003-queue.md) | Postgres-Backed Durable Job Queue | Accepted |
| [ADR-0004](0004-migrations.md) | Forward-Only SQL Migrations with Statement Splitting | Accepted |
| [ADR-0005](0005-i18n.md) | Zero-Dependency Localization and CSS Logical Properties RTL Strategy | Accepted |
| [ADR-0006](0006-billing.md) | Direct Stripe Integration and Webhook Reconciled Entitlements | Accepted |
| [ADR-0007](0007-observability.md) | Operational Observability, Health Endpoints, and Control Bands | Accepted |
| [ADR-0008](0008-oss-rejections.md) | Evaluation and Rejection of External OSS Components | Accepted |
| [ADR-0009](0009-turbostarter-evaluation.md) | Turbostarter Evaluation, Reference Usage, and Pattern Ports | Accepted |

## ADR Structure

Each ADR follows the standard architecture decision record structure:
- **Context:** Background and rationale leading to the decision.
- **Status:** Decision status (`Proposed`, `Accepted`, `Deprecated`, or `Superseded`).
- **Decision:** The specific architectural choice made.
- **Alternatives Considered:** Options evaluated prior to making the decision.
- **Consequences:** Trade-offs, benefits, and operational impacts resulting from the decision.
