# Contributing

Thanks for helping improve DMCloser. Keep changes focused and align them with the
existing product, safety rules, and architecture.

## Before you change code

- Read [AGENTS.md](AGENTS.md), [intent.md](intent.md), [spec.md](spec.md),
  [plan.md](plan.md), and [ROADMAP.md](ROADMAP.md). Check the [ADR index](docs/adr/README.md)
  before changing architecture.
- For substantial work, discuss scope in a GitHub issue first and reference the relevant
  requirement or gate.
- Never commit `.env`, `.data`, credentials, customer data, or generated secrets.

## Set up and run checks

Use Node.js 22 and npm:

```sh
npm ci
cp .env.example .env
npm test
npx playwright install chromium
npm run test:e2e
```

`npm test` runs the static and type checks, server tests, production build, and dependency
audit. Playwright runs the browser suite; on Linux, install system packages if needed with
`npx playwright install --with-deps chromium`.

For database changes, add a new numbered SQL migration—never edit an applied migration.
Then register its checksum and verify schema parity against a scratch database:

```sh
node scripts/check-migrations.mjs --update
npm run check:prisma
```

See [the Prisma parity notes](scripts/prisma/README.md) for database requirements.

## Open a pull request

Use the [pull request template](.github/pull_request_template.md). Link the issue using the
required `Closes #<number>` form, and include the requirement/gate, checks and results,
test coverage, risk, and rollback plan. Update relevant documentation and evidence when
behavior or release status changes.

For security vulnerabilities, follow [SECURITY.md](SECURITY.md); do not report them in a
public issue.
