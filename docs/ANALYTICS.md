# DMCloser — Product Analytics & Consent Specification

## Overview
DMCloser uses PostHog for consent-gated product analytics to answer funnel questions (`signup` → `workspace_created` → `channel_connected` → `draft_generated` → `reply_sent` → `outcome_recorded`).

## Privacy & Guardrails
1. **Consent-Gated**: By default, `analyticsConsent` in workspace settings is `false`. No event is captured or sent unless consent is explicitly granted (`analyticsConsent: true`).
2. **Zero PII**: No email, phone number, message text, message body, or token is included in any property.
3. **Hashed Workspace ID**: Every event is keyed by a server-side SHA-256 hashed workspace ID (`sha256(workspaceId)`).
4. **Kill Switch**: Capture can be completely stopped via environment flag (`POSTHOG_ENABLED=false`).
5. **EU Host Support**: Supports PostHog EU host via `POSTHOG_HOST=https://eu.i.posthog.com`.

## Event Taxonomy

| Event Name | Trigger | Properties Included |
|---|---|---|
| `signup` | User signs up | `$process_person_profile: false` |
| `workspace_created` | Workspace is created | `$process_person_profile: false` |
| `channel_connected` | Messaging account connected | `platform`, `$process_person_profile: false` |
| `draft_generated` | AI reply suggestion generated | `latencyMs`, `safe`, `confidence`, `$process_person_profile: false` |
| `reply_sent` | Reply queued / approved | `automatic`, `sender`, `$process_person_profile: false` |
| `outcome_recorded` | Commercial outcome recorded | `outcome`, `reason`, `$process_person_profile: false` |

## Configuration Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `POSTHOG_API_KEY` | PostHog Project API Key | Unset (Disabled if unset) |
| `POSTHOG_HOST` | PostHog API Host (US or EU) | `https://us.i.posthog.com` |
| `POSTHOG_ENABLED` | Kill switch (`true` / `false`) | `true` |
