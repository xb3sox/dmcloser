# DMCloser — AI-Native Build Guide

**Strategy:** Don’t build everything. **Assemble proven OSS, then build only DMCloser’s differentiation.**

## Technology Leverage

| Layer | Leverage | How |
|---|---|---|
| Inbox/channels | **Chatwoot** | Fork MIT core → Instagram/WhatsApp, conversations, contacts, teams |
| CRM | **Twenty** | Reuse MIT UI/SDK patterns → leads, pipeline, opportunities |
| Config/workflows | **Corteza** | Reuse Apache-2.0 patterns → sector profiles, RBAC, configurable records |
| Automation | **Activepieces** | Integrate → visual triggers/actions/approvals |
| Notifications | **Novu** | Integrate → notification workflows/preferences |
| AI UX | **Chatbase + Fin** | Benchmark agent, qualification, handoff UX; don’t copy code |
| AI backend | **Vercel AI SDK + Zod** | Qualification, summaries, structured reply generation |
| AI quality | **Langfuse** | Prompts, traces, evaluations, cost monitoring |
| Qualification flows | **Typebot** | Reference UX; avoid copying restricted code |
| Analytics | **PostHog** | Funnels, feature flags, experiments |
| Research | **REA** | Reverse-engineer observable competitor workflows → requirements |
| DB | **PostgreSQL + Drizzle** | DMCloser data, tenancy, audit, migrations |
| Auth | **Better Auth** | Organizations, users, roles |
| Jobs | **pg-boss** | Webhooks, retries, scheduled follow-ups |
| Testing | **Playwright + Vitest + axe** | E2E, unit, Arabic/RTL/accessibility |
| Security | **Gitleaks + Trivy + Semgrep** | Automated security gates |

## AI-Native Workflow

### 1. REA → Competitor Research

- Study Chatbase, Fin, respond.io, SleekFlow, WATI, and Manychat.
- Convert observations into neutral `FEAT/FR/AC` requirements.

### 2. AI Coding Agent → Repository Inventory

- Read `AGENTS.md`, PRD, TECH, and DESIGN.
- Inventory existing UI.
- Mark **reuse / modify / replace**.

### 3. Chatwoot → Foundation

- Extract/fork inbox, contacts, conversations, assignments, and channel patterns.
- Replace support-centric concepts with **lead → qualify → nurture → close**.

### 4. Add DMCloser Domain

```text
Tenant
Contact
Lead
Conversation
Message
Qualification
Opportunity
AIRecommendation
Approval
Outcome
SectorProfile
AuditEvent
```

### 5. Connect Meta

```text
Instagram/WhatsApp
→ webhook
→ verify
→ PostgreSQL
→ pg-boss
→ normalize
→ inbox
```

### 6. Add AI

```text
Conversation
→ AI SDK
→ qualification
→ summary
→ recommended action
→ reply draft
→ risk check
→ human approval
→ send
```

### 7. Add Differentiation

- Arabic-first RTL
- Saudi-first UX
- Sector profiles
- Sales qualification
- Next-best-action
- Human-controlled AI
- Conversation → opportunity → revenue attribution

### 8. Add Automation

- Activepieces for workflows.
- Novu for notifications.
- PostHog for funnels.
- Langfuse for AI quality.

### 9. AI-Agent Development Loop

```text
PRD requirement
→ coding agent
→ implementation
→ Vitest
→ Playwright
→ security scan
→ acceptance criteria
→ commit
```

### 10. Build Order

```text
Inbox
→ Meta channels
→ CRM
→ Qualification
→ AI drafts
→ Approval
→ Automation
→ Analytics
→ Sector profiles
→ Arabic polish
→ Pilot
```

## Core Principle

**Chatwoot gives you the messaging foundation; OSS supplies commodity features; your code should concentrate on DMCloser’s AI sales intelligence, Arabic experience, qualification, and conversion engine.**
