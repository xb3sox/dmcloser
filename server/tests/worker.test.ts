import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, type Database } from "../db.ts";
import { Worker } from "../worker.ts";
import type { Config } from "../config.ts";
import type { ProductService } from "../service.ts";

// The queue is the part that decides whether a customer's message is answered.
// These tests pin the two properties that make it safe to run more than one job
// at a time: parallel work, and a row that is never processed twice.

const config: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiKey: "test-configured",
  openaiModel: "fake-eval",
  aiTimeout: 1000,
  workerConcurrency: 1,
  workerKinds: [],
  workerEnabled: false,
  graphVersion: "v26.0",
  prices: {},
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
  metricsToken: "internal-test-token",
  posthogHost: "https://us.i.posthog.com",
  posthogEnabled: true,
};

let db: Database;

before(async () => {
  db = await createDatabase({
    ...config,
    databaseUrl: process.env.TEST_DATABASE_URL,
  });
});
after(async () => {
  await db.close();
});

/** A fake workspace owner: only the surface the worker touches is real. */
function fakeService(handler: (job: any) => Promise<void>) {
  const seen: string[] = [];
  let active = 0;
  let peak = 0;
  const service = {
    config,
    metrics: { aiFailures: 0 },
    db,
    changed() {},
    audit: async () => {},
    failMessage: async () => {},
    ingest: async () => {},
    delivery: async () => {},
    generate: async () => {},
    deliver: async () => {},
    queueMessage: async () => {},
    revenue: { processTask: async () => {} },
    quality: { runVersion: async () => {} },
    meta: { refreshInstagram: async () => ({ token: "x", expiresAt: 0 }) },
    enqueue: async (kind: string, payload: object, workspaceId: string | null) =>
      db.query(
        "INSERT INTO jobs(id,workspace_id,kind,payload,available_at) VALUES($1,$2,$3,$4,$5)",
        [
          `${kind}:${Math.random().toString(36).slice(2)}`,
          workspaceId,
          kind,
          JSON.stringify(payload),
          Date.now(),
        ],
      ),
  } as unknown as ProductService;
  // The worker routes by kind; sales-task is the cheapest hook that the fake
  // can own end to end without a real workspace row.
  service.revenue = {
    processTask: async (_workspace: string, taskId: string) => {
      seen.push(taskId);
      active++;
      peak = Math.max(peak, active);
      try {
        await handler({ taskId });
      } finally {
        active--;
      }
    },
  } as any;
  return { service, seen, peak: () => peak };
}

async function reset() {
  await db.query("DELETE FROM jobs");
}

async function seed(count: number) {
  for (let i = 0; i < count; i++)
    await db.query(
      "INSERT INTO jobs(id,workspace_id,kind,payload,available_at) VALUES($1,$2,$3,$4,$5)",
      [`par-${i}`, null, "sales-task", JSON.stringify({ taskId: `t-${i}` }), Date.now()],
    );
}

test("claims AI work with a lease that outlives the model timeout", () => {
  const { service } = fakeService(async () => {});
  const worker = new Worker(service, {} as any, { concurrency: 1 });
  const generateLease = worker.leaseFor("generate");
  assert.ok(
    generateLease > config.aiTimeout,
    "a 60s lease is shorter than a slow AI call and lets a second worker steal the row",
  );
  assert.ok(worker.leaseFor("webhook") < generateLease);
});

test("runs independent jobs concurrently up to the configured limit", async () => {
  await reset();
  await seed(4);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { service, seen, peak } = fakeService(async () => {
    if (seen.length >= 3) release();
    await gate;
  });
  const worker = new Worker(service, {} as any, { concurrency: 3 });
  const timers: NodeJS.Timeout[] = [];
  worker.start();
  try {
    await gate;
    await worker.stop();
  } finally {
    for (const timer of timers) clearTimeout(timer);
  }
  assert.equal(
    peak(),
    3,
    `expected three jobs in flight together, saw ${peak()}`,
  );
});

test("a job is never processed twice across two workers", async () => {
  await reset();
  await seed(6);
  const seen: string[] = [];
  const run = async (taskId: string) => {
    seen.push(taskId);
    await new Promise((resolve) => setTimeout(resolve, 25));
  };
  const a = fakeService(async ({ taskId }) => run(taskId));
  const b = fakeService(async ({ taskId }) => run(taskId));
  const workerA = new Worker(a.service, {} as any, { concurrency: 2 });
  const workerB = new Worker(b.service, {} as any, { concurrency: 2 });
  for (let i = 0; i < 30; i++) {
    await workerA.once();
    await workerB.once();
  }
  const all = [...a.seen, ...b.seen];
  assert.equal(new Set(all).size, all.length, `duplicate work: ${all}`);
  assert.ok(a.seen.length + b.seen.length >= 6, "not every job ran");
});

test("a job failed with a permanent error is not retried forever", async () => {
  await reset();
  await seed(1);
  let attempts = 0;
  const { service } = fakeService(async () => {
    attempts++;
    throw new Error("boom");
  });
  const worker = new Worker(service, {} as any, { concurrency: 1 });
  await worker.once();
  const [row] = await db.query("SELECT state,attempts,error FROM jobs");
  assert.equal(row.state, "pending", "a transient error must be retried");
  assert.equal(row.attempts, 1);
  assert.ok(row.error, "the customer-facing reason is stored on the job");
  assert.equal(attempts, 1);
});
