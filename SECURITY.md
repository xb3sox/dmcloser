# Security Policy

DMCloser takes the security of our application, user data, and AI interactions seriously.

## Supported Versions

Only the latest version on the primary default branch is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| < 1.0   | :x:                |

## Scope

This security policy applies to:
- DMCloser Express 5 API server (`server/`)
- Authenticated multi-tenant workspace isolation and session management
- Secure webhook ingestion and signature validation (Instagram & WhatsApp)
- Scrypt password hashing, token storage, and workspace export/erasure
- AI grounding safeguards and prompt execution limits (`server/ai.ts`, `src/domain/safety.ts`)

Out of scope:
- Client-side browser demo mode (`/app` in local storage)
- Third-party social or LLM provider outages or upstream platform vulnerabilities

## Private Disclosure Contact

If you discover a security vulnerability or potential risk within DMCloser, please report it
privately. Do **not** create a public GitHub issue.

- **Channel:** contact repository administrator `@xb3sox` through GitHub. GitHub private
  vulnerability reporting is not available on this repository's plan (API returns
  `404 Not Found` for `repos/xb3sox/dmcloser/private-vulnerability-reporting`).
  The mailbox `security@dmcloser.com` is unverified with no receipt proof in the repository,
  and is not an operational disclosure channel today.
- **Acknowledged status:** `@xb3sox` is the sole verified maintainer channel known to exist today.
  Tracked in #124.
- **Response target:** named responder `@xb3sox` aims to acknowledge reports within 48 hours
  and to update every 5 business days until resolution. This target is a best-effort
  commitment by a single maintainer and is not a contractual SLA.

## Disclosure Guidelines

- Provide detailed steps to reproduce the issue, including HTTP request/response samples if applicable.
- Do not exploit identified vulnerabilities to access data belonging to other workspaces or tenants.
- Give us reasonable time to investigate and issue a patch before making any information public.
