# Load lab — the inbound path

`scripts/loadtest/run.mjs` measures the part of dmcloser a customer feels: a message
arrives and the app has to answer it. No dependencies, plain Node.

## Scope — read this before quoting the numbers

Every figure below was measured against a **development-mode** server. In production mode
`POST /api/development/inbound` throws 404 by design (`server/app.ts:1363`), so the harness
has no inbound path and falls back to rejection: a production-mode run against the compose
stack measured 343 × 429 and 162 × 404 out of 600 requests, i.e. it fails itself rather than
the product.

The supported production measurement is the loader's **webhook mode**: it probes a signed
Meta webhook first and only uses it when the server accepts the signature, which requires
`META_APP_SECRET` to be set. That path has never been run — the production inbound baseline
is unmeasured, and the numbers in this file must not be presented as production capacity.

## What it does

1. Registers N throwaway workspaces, one owner each, each from its own loopback source
   address so the per-IP rate limiter measures one customer instead of the whole harness.
2. Warms one messaging connection per workspace so inbound traffic has something to
   resolve against.
3. Fires a fixed-duration, fixed-concurrency mix: Meta-shaped inbound webhook POSTs plus
   authenticated inbox reads.
4. Prints p50/p95/p99, throughput, error rate by status code, and the **maximum single
   request** compared against a ceiling.

Exit codes: 0 clean, 1 ceiling or error-rate breach, 2 harness error.

## Run it

Against a local API:

```sh
npx tsx server/index.ts                     # one terminal, API on 3001
node scripts/loadtest/run.mjs \
  --base-url http://127.0.0.1:3001 \
  --origin http://localhost:5173 \
  --workspaces 20 --concurrency 25 --duration 30 --max-rps 40 \
  --out /tmp/load.json
```

Against the production image, point `--base-url` at the container's port and pass the real
`--secret` for signed webhooks. Never point it at a public host or at a database that holds
a real customer's data.

## What the numbers mean

- **p99** — 99 of 100 requests were faster than this. This is the customer's bad day.
- **max observed** — the worst single request. Compared against the ceiling.
- **dead jobs** — background work that gave up. Should be zero unless a provider is down.
- **pending jobs after the run** — the queue still has work. If this grows while load is
  steady, the worker is losing.

## The hard ceiling

Every AI call is bounded by `AI_TIMEOUT_MS` (default 8000). The lab fails the run when any
request exceeds `AI_TIMEOUT_MS + 2000`. A customer must never wait on a model that has
stalled: the request returns, the job stays queued, and the retry happens out of band.

One inbound message can need two model calls, so worker concurrency is deliberately low by
default (`WORKER_CONCURRENCY=2`). Raise it only when the lab shows p99 still under the
ceiling and the provider is not throttling. The queue absorbs the wait — not the user.

## Baseline measured 2026-10-23

Local, PGlite, single process, `OPENAI_API_KEY` unset, so the AI path never ran. This is a
floor, not a production number: a real Postgres pool and a real model change both columns.

Run 1 — 6 workspaces, 6 in flight, 15 s, cap 15 rps, `WORKER_CONCURRENCY=2`:

- 225 requests, 0 errors, 15 req/s
- p50 24.8 ms · p95 57.8 ms · p99 82 ms · max 103.8 ms
- queue after run: 101 dead, **28 pending**

Run 2 — 20 workspaces, 25 in flight, 30 s, cap 40 rps, `WORKER_CONCURRENCY=2`:

- 1200 requests, 0 errors, 40 req/s
- p50 60.1 ms · p95 158.8 ms · p99 330.5 ms · max 394.3 ms
- queue after run: 55 dead, **544 pending**

Finding: the worker issued one claim per 150 ms tick, which caps it near 6 jobs/s against
~24 inbound messages/s. The queue grew while the API stayed fast — a silent backlog that
would surface as "the bot is slow" hours later. Fixed by topping the instance back up to its
concurrency on every tick.

Run 3 — same shape as run 2, after the fix, `WORKER_CONCURRENCY=8`:

- 1200 requests, 0 errors, 40 req/s
- p50 78.8 ms · p95 195.6 ms · p99 338 ms · max 411.2 ms
- queue after run: 600 dead, **0 pending**

The backlog is gone. Latency cost of the extra parallelism is inside noise at this size.
All 600 dead jobs are `AI is not configured`, which is correct behaviour with no key: the
job fails permanently and the operator can still reply by hand.

## Instrument Stage Timings & Measured Baselines

Instrumented per-stage timing breakdown recorded per reply in `suggestions`:
- `ingest_ms`: Time from message arrival / timestamp to job start
- `persistence_ms`: DB query time for conversation history, workspace settings, and business profile/brain context
- `model_ms`: External AI model call latency
- `draft_write_ms`: Time spent storing the draft suggestion and enqueuing auto-send

### Baseline 1: Local Dev Environment (Fake Provider — Unconfigured AI)
Environment: `node v22`, `PGlite`, single-process local server, `OPENAI_API_KEY` unset.
Run shape: 10 workspaces, 10 in flight, 10s, cap 20 rps, `WORKER_CONCURRENCY=2`.
- Requests: 200 total (20 req/s), 0 HTTP errors.
- HTTP API Latency: p50 93.3 ms · p95 135.4 ms · p99 216.7 ms · max 223 ms.
- Queue / AI layer: 0 suggestions (AI path fails fast with `AI_NOT_CONFIGURED`).

### Baseline 2: Local Dev Environment (Mock AI Provider — Instrumented Stage Breakdown)
Environment: `node v22`, `PGlite`, local API server with `WORKER_CONCURRENCY=4`, Mock AI server on port 4000 (350ms model latency).
Run shape: 10 workspaces, 10 in flight, 15s, cap 20 rps.
- Requests: 300 total (20 req/s), 0 HTTP errors.
- HTTP API Latency: p50 79.9 ms · p95 174.3 ms · p99 200.9 ms · max 229.7 ms.
- AI Generation Samples: 182 suggestions recorded.
- Per-Stage Latency Breakdown (Mean / p95):
  - `ingest_ms` (queue wait): Mean 2023 ms · p95 6609 ms (under load queue wait dominates total delay)
  - `persistence_ms`: Mean 36 ms · p95 52 ms
  - `model_ms`: Mean 381 ms · p95 468 ms
  - `draft_write_ms`: Mean 2 ms · p95 2 ms
- Histogram buckets (`/internal/metrics`):
  - `<= 250ms`: 0
  - `<= 500ms`: 174
  - `<= 1000ms`: 195
  - `<= 1500ms`: 202
  - `<= 2000ms`: 211
  - `<= 3000ms`: 236
  - `<= 5000ms`: 291
  - `> 5000ms`: 84

## Still unmeasured

- Real Live Credentials: Meta Business OAuth / production WhatsApp & OpenAI live accounts.
- Real Postgres: PGlite is single-writer, so the claim transaction is serialised in a way
  production will not be. Expect better, verify anyway.
- More than one process: `WORKER_KINDS` and `WORKER_ENABLED` allow a dedicated worker.
  Run two instances of the lab against a two-process deployment before enabling that.
