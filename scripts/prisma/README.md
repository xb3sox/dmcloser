# Prisma in this repo

Prisma is **not** the runtime data layer. The app still talks to Postgres through
`server/db.ts` and the hand-written SQL in `server/migrations/`. `prisma/schema.prisma`
exists so the schema has one readable, typed description, and so a future migration away
from raw SQL starts from a verified baseline instead of a guess.

That only stays true if it is checked. `scripts/prisma/verify-parity.mjs` is that check.

## Verify

```sh
node scripts/prisma/verify-parity.mjs
```

It starts a throwaway `postgres:17-alpine` on port 5433, applies every
`server/migrations/*.sql` in filename order, then runs

```sh
npx prisma@6 migrate diff --from-url <that db> --to-schema-datamodel prisma/schema.prisma --script
```

and fails when the script is not empty. Exit codes: 0 match, 1 drift, 2 harness error.
The container is removed afterwards; `--keep` leaves it for inspection.

To diff against a database you already have, skip Docker:

```sh
PARITY_DATABASE_URL=postgres://user:pass@host:5432/db node scripts/prisma/verify-parity.mjs
```

Use a scratch database. The script applies migrations, so pointing it at a database with
real data is a mistake.

## Why it is not in `scripts/check.mjs`

The default gate runs against a Postgres that already holds test data. Parity needs an
empty database of its own, so it runs as its own CI step (or by hand) rather than inside
the unit-test gate.

## Baseline, if the project ever adopts Prisma proper

```sh
# 1. one migration that represents "everything up to today"
npx prisma@6 migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/00000000000000_baseline/migration.sql

# 2. tell Prisma the baseline is already applied in every existing database
npx prisma@6 migrate resolve --applied 00000000000000_baseline

# 3. from then on
npx prisma@6 migrate dev --name <change>
```

Deploy order stays: run migrations, then start the app. Never start the app first.

## What Prisma cannot express here

`prisma/schema.prisma` is a faithful 1:1 translation — table names via `@@map`, column
names verbatim, referential actions as declared. Two things live only in SQL and would
need hand-written migration steps if Prisma ever owns the schema:

- **CHECK constraints**: role/platform/kind/stage/status/industry allow-lists, price and
  amount ranges, `brain_links.from_id <> to_id`, `valid_days` range.
- **The partial unique index** `messages_one_reply_per_source`.

Both are listed in the header of `prisma/schema.prisma`. Dropping them silently would
loosen rules the product depends on.
