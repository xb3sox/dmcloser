# DMCloser

A bilingual (English and Arabic) sales inbox for Instagram and WhatsApp, with
AI-assisted replies and tools for managing opportunities and revenue. Built with
React, TypeScript, Vite, Node.js, and Express; PostgreSQL is used in production.

## Features

- Manage channel conversations and lead context in one workspace.
- Draft replies with AI using approved business context and safety checks.
- Track deals, quotes, and outcomes; distinguish estimates from confirmed receipts.
- Work in English or Arabic, including right-to-left layouts.

Forecasts are estimates. Receipts are owner-confirmed, not payment-processor
verified.

## Quick start

**Requirements:** Node.js 22 (see [`.nvmrc`](.nvmrc)) and npm.

```sh
npm ci
cp .env.example .env
```

The local defaults use `localhost`. If you change hosts, keep `APP_URL`,
`API_PUBLIC_URL`, and `VITE_API_URL` consistent; do not mix `localhost` and
`127.0.0.1`.

Start the API and web app in separate terminals:

```sh
npm run serve  # API: http://localhost:3001
npm run dev    # Web app: http://localhost:5173
```

Open <http://localhost:5173>:

| Path | Description |
| --- | --- |
| `/` | Landing page |
| `/app` | Isolated demo |
| `/workspace` | Sign up or log in to the authenticated product |

Without `DATABASE_URL`, local development uses PGlite; a separate PostgreSQL
server is not needed. The app can run locally without live provider credentials;
real integrations require their own credentials. Data is stored in `.data/`.
Keep `.data/encryption.key` to retain access to locally encrypted data. Never
commit `.env`, `.data`, or credentials.

## Tests

`npm test` runs static and type checks, server tests, a production build, and
`npm audit`. Browser tests use Playwright and start local services as needed.

```sh
npx playwright install chromium
npm run test:e2e
```

On Linux, if Playwright reports missing system packages, install them with
`npx playwright install --with-deps chromium`.

## Configuration and deployment

Edit `.env` to configure integrations. A production launch requires PostgreSQL
via `DATABASE_URL`, HTTPS `APP_URL` and `API_PUBLIC_URL`, a persistent
64-character hex `ENCRYPTION_KEY`, and transactional email. Configure provider
credentials for the services you enable. Docker Compose is provided; see the
[operations guide](docs/OPERATIONS.md) before deploying.

## Documentation

- [Contributing](CONTRIBUTING.md) — setup, tests, and pull request requirements
- [Operations](docs/OPERATIONS.md) — configuration, integrations, deployment, and runbooks
- [API reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Revenue OS](docs/REVENUE_OS.md)
- [Security policy](SECURITY.md)
- [Evidence ledger](docs/EVIDENCE.md) — verification and outstanding release gates

## Support

For bugs, questions, or feature requests, use
[GitHub Issues](https://github.com/xb3sox/dmcloser/issues). For security
vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of filing a public issue.

## License

No license file is currently provided. Public visibility alone does not grant permission to
reuse or redistribute this code.

**Status:** Functional product; production launch awaits external gates and owner
approval. See the [evidence ledger](docs/EVIDENCE.md); local tests do not certify
production readiness.
