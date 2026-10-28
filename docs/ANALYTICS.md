# Product Analytics

Server-side PostHog capture. The browser never receives a PostHog key and no
client SDK is loaded.

## Consent and kill switch

- Consent is stored per workspace as `settings.analyticsConsent`; the settings
  page exposes it as **Product analytics**. Default is off.
- `ANALYTICS_ENABLED=false` stops all capture without a deploy.
- `POSTHOG_KEY` unset means no client is created.
- The distinct id is a 16-character SHA-256 prefix of the workspace id, never the
  raw id.

## Events

Every property not in this table is dropped before capture.

| Event | Allowed properties |
|---|---|
| `signup` | none |
| `workspace_created` | `plan`, `industry` |
| `channel_connected` | `platform` |
| `draft_generated` | `intent`, `confidence`, `safe` |
| `reply_sent` | `platform`, `automatic` |
| `outcome_recorded` | `stage`, `currency` |

No message text, email, phone, token, cookie or provider payload is captured.
`server/tests/analytics.test.ts` fixes the payload shape and injects forbidden
fields to prove they are removed.
