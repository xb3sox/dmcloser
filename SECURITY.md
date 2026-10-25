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

- **Channel:** contact repository administrator `@xb3sox` through GitHub, or email
  `security@dmcloser.com`. GitHub private vulnerability reporting is not available on this
  repository's plan, so the repository itself has no private-report button.
- **Acknowledged status:** the mailbox is not verified from inside the repository. Until it
  is, `@xb3sox` is the channel that is known to exist. Tracked in #124.
- **Response target, not a guarantee:** we aim to acknowledge within 48 hours and to update
  every 5 business days until resolution. The target is a best effort by a single maintainer;
  do not treat it as a contractual SLA.

## Disclosure Guidelines

- Provide detailed steps to reproduce the issue, including HTTP request/response samples if applicable.
- Do not exploit identified vulnerabilities to access data belonging to other workspaces or tenants.
- Give us reasonable time to investigate and issue a patch before making any information public.
