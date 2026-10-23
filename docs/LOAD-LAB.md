# Load lab — the inbound path

`scripts/loadtest/run.mjs` measures the part of dmcloser a customer feels: a message
arrives and the app has to answer it. No dependencies, plain Node.

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

## Still unmeasured

- The AI path itself: with no key, the 8 s timeout, the two-call worst case and the
  provider rate limit were never exercised. Run the lab with a key before trusting any
  claim about reply latency.
- Real Postgres: PGlite is single-writer, so the claim transaction is serialised in a way
  production will not be. Expect better, verify anyway.
- More than one process: `WORKER_KINDS` and `WORKER_ENABLED` allow a dedicated worker.
  Run two instances of the lab against a two-process deployment before enabling that.
