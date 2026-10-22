# Agent Instructions (upstream proposal)
> Owner: Founder (BRNGT LLC, founder-reported) | Version: 0.5 (working draft) | Updated: 2026-10-20 | Approval: not granted
> **Status: superseded.** This document was written against an *uninspected* repository and
> describes a product to be built. The repository is now built. **The
> [root `AGENTS.md`](../AGENTS.md) is the authoritative agent guide** — read it first.

## Correction

The previous revision of this file stated: *"Founder has some UI screens only"* and *"no
version-controlled repository or executable project files were supplied."* Both are false.
The repository is a complete, working, tested product. This file is kept as the **upstream
proposal** it is — its requirement identifiers, its engineering rules, and its completion
criteria are still the standard the implementation is measured against — but its project
context and command section are superseded.

Actual commands, layout, gates and hard rules: **[root `AGENTS.md`](../AGENTS.md)**.

## Project Context (as proposed)
DMCloser 2.0 is an Arabic/English SaaS workspace for Instagram/WhatsApp conversational sales and verified outcomes, across all sectors.

## Source of Truth
1. [Product Brief](BRIEF.md) is authoritative for identity, verified founder decisions and business/product boundaries.
2. [Business Plan](BUSINESS.md) owns market, competitors, revenue, financial and legal/commercial assumptions.
3. [PRD](PRD.md) owns roles, functionality, permissions, acceptance and release behavior.
4. [Technical Design](TECH.md) owns proposed architecture, data flows, API conventions and deployment constraints.
5. [Visual Design](DESIGN.md) owns the upstream provisional token set. **Its colour palette is
   rejected** — the [root `DESIGN.md`](../DESIGN.md) is the normative brand and identity
   contract, and the shipped tokens in `src/styles/system.css` prevail.

**Shipped and authoritative instead:** [root `AGENTS.md`](../AGENTS.md) · [`spec.md`](../spec.md) ·
[root `SPEC.md`](../SPEC.md) (requirement status index) · [root `DESIGN.md`](../DESIGN.md) ·
[ARCHITECTURE.md](ARCHITECTURE.md) · [API.md](API.md) · [OPERATIONS.md](OPERATIONS.md) ·
[REVENUE_OS.md](REVENUE_OS.md) · [REVIEW.md](REVIEW.md)

## Commands and Project Structure
Superseded — see the [root `AGENTS.md`](../AGENTS.md) for the verified stack, the repo
layout table, and the single gate entry point (`node scripts/check.mjs`).

## Engineering Rules
Always link code/tasks to a stable `FEAT`, `FR`, `NFR` and `AC` identifier. Prefer smallest vertical slice and preserve original UI asset quality. Use official provider connectors, validate and deduplicate signed webhooks, tenant-scope databases/jobs, store secrets outside source, never expose messages or phone numbers in logs. Any AI-suggested outbound message needs enforced policy rule and human control at declared gate. Handle missing data, stale sources, timeout, opt-out, retry and cancel. Provide accessible 360px mobile flow and Arabic RTL. Favor a minimal deployable monolith and reversible DB migrations; document deviations as ADR amendments. No prototype may claim paid outcomes without proof.

## Completion Criteria
For every changed feature: record the requirement ID, tests run and results, reviewed accessibility states, cross-tenant/auth risks, malformed/replayed event test, observable errors, provider cost behavior, docs updates and rollback path. Mark validation as pending if not executed. Hold real-customer release behind privacy and Meta permission checks. Change owner-visible financial claims only with evidence.

## Boundaries
Do not rewrite or delete current UI without owner review. Never read, copy, commit or display `.env`, private keys, third-party tokens or customer conversation dumps in docs or testing. Do not purge production data, modify permissions, incur vendor billing, send live messages, activate autonomous AI, or deploy to production without explicit founder authorization. Synthetic-only sandbox work is allowed after infrastructure choices and keys are supplied. Human counsel/accountant approvals cannot be simulated.

## References
Consult [PRD](PRD.md) for acceptance and [TECH](TECH.md) for proposed integration contracts. [README](README.md) holds readiness and unresolved external actions.
