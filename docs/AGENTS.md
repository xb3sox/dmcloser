# Agent Instructions
> Owner: Founder (BRNGT LLC, founder-reported) | Version: 0.5 (working draft) | Updated: 2026-10-20 | Approval: not granted

## Project Context
DMCloser 2.0 is an Arabic/English SaaS workspace for Instagram/WhatsApp conversational sales and verified outcomes, across all sectors. Founder has some UI screens only; this documentation specifies proposed future behavior. Do not assume deployed services or root commands.

## Source of Truth
1. [Product Brief](BRIEF.md) is authoritative for identity, verified founder decisions and business/product boundaries.
2. [Business Plan](BUSINESS.md) owns market, competitors, revenue, financial and legal/commercial assumptions.
3. [PRD](PRD.md) owns roles, functionality, permissions, acceptance and release behavior.
4. [Technical Design](TECH.md) owns proposed architecture, data flows, API conventions and deployment constraints.
5. [Visual Design](DESIGN.md) owns normative design tokens and visual component styling; reused UI prevails until inspected.

## Commands and Project Structure
**Pre-implementation; no version-controlled repository or executable project files were supplied.** No install, dev, lint, test, build or deployment commands have been verified and none should be invented. The existing UI may use another stack; inspect its package manifests and scripts with the founder before choosing commands. Proposed logical areas: workspace identity, Meta adapter, inbox, business knowledge, AI orchestration, deal/evidence, analytics, usage/billing and tests. These are architecture modules, not asserted actual directories.

## Engineering Rules
Always link code/tasks to a stable `FEAT`, `FR`, `NFR` and `AC` identifier. Prefer smallest vertical slice and preserve original UI asset quality. Use official provider connectors, validate and deduplicate signed webhooks, tenant-scope databases/jobs, store secrets outside source, never expose messages or phone numbers in logs. Any AI-suggested outbound message needs enforced policy rule and human control at declared gate. Handle missing data, stale sources, timeout, opt-out, retry and cancel. Provide accessible 360px mobile flow and Arabic RTL. Favor a minimal deployable monolith and reversible DB migrations; document deviations as ADR amendments. No prototype may claim paid outcomes without proof.

## Completion Criteria
For every changed feature: record the requirement ID, tests run and results, reviewed accessibility states, cross-tenant/auth risks, malformed/replayed event test, observable errors, provider cost behavior, docs updates and rollback path. Mark validation as pending if not executed. Hold real-customer release behind privacy and Meta permission checks. Change owner-visible financial claims only with evidence.

## Boundaries
Do not rewrite or delete current UI without owner review. Never read, copy, commit or display `.env`, private keys, third-party tokens or customer conversation dumps in docs or testing. Do not purge production data, modify permissions, incur vendor billing, send live messages, activate autonomous AI, or deploy to production without explicit founder authorization. Synthetic-only sandbox work is allowed after infrastructure choices and keys are supplied. Human counsel/accountant approvals cannot be simulated.

## References
Consult [PRD](PRD.md) for acceptance and [TECH](TECH.md) for proposed integration contracts. [README](README.md) holds readiness and unresolved external actions.
