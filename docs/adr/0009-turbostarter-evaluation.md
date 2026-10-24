# ADR-0009: Turbostarter Evaluation, Reference Usage, and Pattern Ports

## Status
Accepted

## Context
During initial development planning, Turbostarter (a boilerplate starter kit) was evaluated to identify reusable production patterns. A complete port or adoption of Turbostarter as a boilerplate template was rejected to preserve DMCloser's custom architecture, strict security boundaries, and ivory/forest design system. However, specific underlying architectural patterns were identified as valuable references and explicitly ported into native DMCloser code.

## Decision
We decided to treat Turbostarter strictly as reference code, rejecting full repository template inheritance while explicitly porting four isolated design patterns into DMCloser's native codebase:

### 1. Sentry Monitoring Wrapper Pattern
- **Turbostarter Reference:** Centralized error boundary and exception capturing wrapper.
- **DMCloser Implementation:** Implemented in `server/app.ts` and `server/security.ts` as structured JSON error handling and process crash guards (`uncaughtException`/`unhandledRejection` handlers) that log sanitized error events without leaking customer payload data or secrets.

### 2. Email Provider Abstraction Pattern
- **Turbostarter Reference:** Plugable email sender interface abstracting transactional email delivery providers.
- **DMCloser Implementation:** Implemented in `server/security.ts` via `sendRecoveryEmail()`, which abstracts transactional email delivery through Nodemailer with SMTP transport, supporting zero-config local development fallbacks (logging token to console when SMTP is unconfigured) and production SMTP dispatch.

### 3. Feature Flags Pattern
- **Turbostarter Reference:** Environment-driven and workspace-level feature toggling.
- **DMCloser Implementation:** Implemented in workspace profiles and `autoAllowed()` in `server/service.ts`, providing workspace-level toggles (`auto_send_enabled`, industry sector modes, custom field presets, AI Quality Lab prompt versions) that dynamically gate system capabilities without code deployments.

### 4. Legal Content & Policy Pattern
- **Turbostarter Reference:** Structured legal document rendering and privacy consent management pattern.
- **DMCloser Implementation:** Implemented in `src/components/landing/` and workspace settings as modal-rendered, localized legal disclosures, account export handlers, and audited erasure flow triggers compliant with Saudi privacy principles.

## Alternatives Considered
- **Cloning / Forking Turbostarter directly:** Rejected because starter templates introduce unnecessary boilerplate, mismatched UI styling frameworks, opinionated ORM setups, and unneeded dependencies that violate DMCloser's strict stack restrictions.
- **Zero Reference Usage:** Evaluated writing all operational abstractions entirely from scratch without reference. Rejected as inefficient when proven patterns for error handling and SMTP delivery abstractions were readily available.

## Consequences
- **Positive:** DMCloser benefits from proven production patterns without inheriting boilerplate technical debt, unwanted dependencies, or mismatched visual designs.
- **Negative:** Ported patterns must be maintained natively in DMCloser code as the application evolves.
