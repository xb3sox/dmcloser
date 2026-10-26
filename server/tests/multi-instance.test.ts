import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import http from "node:http";
import { createDatabase, type Database } from "../db.ts";
import { createApp, PostgresRateLimitStore } from "../app.ts";
import type { Config } from "../config.ts";

const config: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://127.0.0.1:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiKey: "test-only",
  openaiModel: "fake",
  aiTimeout: 1000,
  workerConcurrency: 1,
  workerKinds: [],
  workerEnabled: false,
  graphVersion: "v26.0",
  metaSecret: "test",
  instagramSecret: "test",
  verifyToken: "test",
  prices: {},
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
  rateLimitMax: 10000,
  authRateLimitMax: 10000,
  recoveryRateLimitMax: 10000,
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

const TIMEOUT = { timeout: 30000 };

async function waitFor(check: () => boolean, label: string) {
  for (let i = 0; i < 50; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(label);
}

function connectSSE(port: number, cookie: string) {
  const received: string[] = [];
  const req = http.request(
    `http://127.0.0.1:${port}/api/events`,
    { headers: { Cookie: cookie } },
    (res) => {
      res.on("data", (chunk: Buffer) => {
        if (chunk.toString("utf8").includes("event: sync")) received.push("sync");
      });
    },
  );
  req.end();
  return { received, close: () => req.destroy() };
}

test("two app instances sharing one database deliver an event to a client connected to either", TIMEOUT, async () => {
  const app1 = await createApp(config, db);
  const app2 = await createApp(config, db);
  const client = request.agent(app1.app);
  const email = `multi-sse-${randomUUID()}@example.com`;

  const registration = await client
    .post("/api/auth/register")
    .set("Origin", config.appUrl)
    .send({ email, password: "multi instance safety password", name: "Owner", businessName: "Multi Inc" });
  assert.equal(registration.status, 201);

  const { workspace } = (await client.get("/api/bootstrap")).body;
  const cookie = ([] as string[]).concat(registration.headers["set-cookie"]).join("; ");

  const server1 = http.createServer(app1.app);
  const server2 = http.createServer(app2.app);
  await new Promise<void>((resolve) => server1.listen(0, resolve));
  await new Promise<void>((resolve) => server2.listen(0, resolve));
  const port1 = (server1.address() as { port: number }).port;
  const port2 = (server2.address() as { port: number }).port;

  const sse1 = connectSSE(port1, cookie);
  const sse2 = connectSSE(port2, cookie);

  try {
    await waitFor(() => sse1.received.length > 0 && sse2.received.length > 0, "both streams opened");
    const before1 = sse1.received.length;
    const before2 = sse2.received.length;

    app1.service.changed(workspace.id);

    await waitFor(
      () => sse1.received.length > before1 && sse2.received.length > before2,
      "both instances delivered the event within one second",
    );
  } finally {
    sse1.close();
    sse2.close();
    await app1.service.close();
    await app2.service.close();
    server1.closeAllConnections();
    server2.closeAllConnections();
    await new Promise<void>((resolve) => server1.close(() => resolve()));
    await new Promise<void>((resolve) => server2.close(() => resolve()));
  }
});

test("a limit consumed on one instance is counted on the other", TIMEOUT, async () => {
  const app = await createApp(config, db);
  const store1 = new PostgresRateLimitStore(db, "limits");
  const store2 = new PostgresRateLimitStore(db, "limits");
  const key = `ratelimit-test-${randomUUID()}`;

  try {
    assert.equal((await store1.increment(key)).totalHits, 1);
    assert.equal((await store2.increment(key)).totalHits, 2);
    if (db.kind === "postgres") {
      const [row] = await db.query("SELECT hits FROM rate_limits WHERE key=$1", [`limits:${key}`]);
      assert.equal(row.hits, 2);
    }
  } finally {
    await app.service.close();
  }
});

test("each limiter keeps its own counter for the same client", TIMEOUT, async () => {
  const client = `client-${randomUUID()}`;
  const api = new PostgresRateLimitStore(db, "api");
  const auth = new PostgresRateLimitStore(db, "auth");

  assert.equal((await api.increment(client)).totalHits, 1, "the api limiter starts its own counter");
  assert.equal((await auth.increment(client)).totalHits, 1, "a sign-in must not consume the api budget");
});

test("a killed instance does not strand a leased job", TIMEOUT, async () => {
  const app1 = await createApp(config, db);
  const app2 = await createApp(config, db);
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const jobId = `test-lease-${randomUUID()}`;

  try {
    await db.query("INSERT INTO users(id, email, name, password_hash) VALUES($1, $2, 'Test', $3)", [
      userId,
      `user-${randomUUID()}@example.com`,
      "dummy-hash",
    ]);
    await db.query(
      "INSERT INTO workspaces(id, owner_id, settings, trial_until) VALUES($1, $2, '{}', $3)",
      [workspaceId, userId, Date.now() + 86400000],
    );
    // A job leased by instance 1 in the past: instance 1 is gone.
    await db.query(
      "INSERT INTO jobs(id, workspace_id, kind, payload, state, attempts, available_at, lease_until) VALUES($1, $2, 'sales-task', '{}', 'processing', 1, $3, $4)",
      [jobId, workspaceId, Date.now() - 10000, Date.now() - 5000],
    );

    assert.equal(await app2.worker.once(), true);
    const [job] = await db.query("SELECT state FROM jobs WHERE id=$1", [jobId]);
    assert.equal(job.state, "done");
  } finally {
    await app1.service.close();
    await app2.service.close();
  }
});
