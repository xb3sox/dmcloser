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

test("two app instances sharing one database deliver an event to a client connected to either", { timeout: 30000 }, async () => {
  const app1 = await createApp(config, db);
  const app2 = await createApp(config, db);

  const password = "multi instance safety password";
  const client1 = request.agent(app1.app);
  const email = `multi-sse-${randomUUID()}@example.com`;

  const reg = await client1
    .post("/api/auth/register")
    .set("Origin", config.appUrl)
    .send({ email, password, name: "Owner", businessName: "Multi Inc" });
  assert.equal(reg.status, 201);

  const snapshot = (await client1.get("/api/bootstrap")).body;
  const workspaceId = snapshot.workspace.id;

  const server1 = http.createServer(app1.app);
  const server2 = http.createServer(app2.app);

  await new Promise<void>((res) => server1.listen(0, res));
  await new Promise<void>((res) => server2.listen(0, res));

  const port1 = (server1.address() as any).port;
  const port2 = (server2.address() as any).port;

  const cookies = reg.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : String(cookies || "");

  function listenSSE(port: number): {
    receivedEvents: string[];
    close: () => void;
  } {
    const receivedEvents: string[] = [];
    const req = http.request(
      `http://127.0.0.1:${port}/api/events`,
      { headers: { Cookie: cookieHeader } },
      (res) => {
        res.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf8");
          if (text.includes("event: sync")) {
            receivedEvents.push(text);
          }
        });
      },
    );
    req.end();
    return {
      receivedEvents,
      close: () => req.destroy(),
    };
  }

  const sse1 = listenSSE(port1);
  const sse2 = listenSSE(port2);

  try {
    // Wait until both streams have connected and received initial event
    for (let i = 0; i < 50; i++) {
      if (sse1.receivedEvents.length >= 1 && sse2.receivedEvents.length >= 1) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.ok(sse1.receivedEvents.length >= 1, "sse1 received initial connection event");
    assert.ok(sse2.receivedEvents.length >= 1, "sse2 received initial connection event");

    const initialCount1 = sse1.receivedEvents.length;
    const initialCount2 = sse2.receivedEvents.length;

    // Instance 1 triggers an event
    app1.service.changed(workspaceId);

    // Assert both receive the sync event within 1 second
    for (let i = 0; i < 50; i++) {
      if (
        sse1.receivedEvents.length > initialCount1 &&
        sse2.receivedEvents.length > initialCount2
      )
        break;
      await new Promise((r) => setTimeout(r, 20));
    }

    assert.ok(
      sse1.receivedEvents.length > initialCount1,
      "Instance 1 connected SSE client received broadcasted event",
    );
    assert.ok(
      sse2.receivedEvents.length > initialCount2,
      "Instance 2 connected SSE client received broadcasted event",
    );
  } finally {
    sse1.close();
    sse2.close();
    await app1.service.close();
    await app2.service.close();
    server1.closeAllConnections();
    server2.closeAllConnections();
    await new Promise<void>((res) => server1.close(() => res()));
    await new Promise<void>((res) => server2.close(() => res()));
  }
});

test("a limit consumed on one instance is counted on the other", { timeout: 30000 }, async () => {
  const app1 = await createApp(config, db);
  const app2 = await createApp(config, db);

  try {
    const store1 = new PostgresRateLimitStore(db, "limits");
    const store2 = new PostgresRateLimitStore(db, "limits");
    const key = `ratelimit-test-${randomUUID()}`;

    const res1 = await store1.increment(key);
    assert.equal(res1.totalHits, 1);

    const res2 = await store2.increment(key);
    assert.equal(res2.totalHits, 2);

    if (db.kind === "postgres") {
      const [row] = await db.query("SELECT hits FROM rate_limits WHERE key=$1", [
        `limits:${key}`,
      ]);
      assert.equal(row.hits, 2);
    }
  } finally {
    await app1.service.close();
    await app2.service.close();
  }
});

test("each limiter keeps its own counter for the same client", { timeout: 30000 }, async () => {
  const api = new PostgresRateLimitStore(db, "api");
  const auth = new PostgresRateLimitStore(db, "auth");
  const client = `client-${randomUUID()}`;

  const first = await api.increment(client);
  const second = await auth.increment(client);

  assert.equal(first.totalHits, 1, "the api limiter starts a fresh counter");
  assert.equal(
    second.totalHits,
    1,
    "a sign-in attempt must not consume the api budget",
  );
});

test("a killed instance does not strand a leased job", { timeout: 30000 }, async () => {
  const app1 = await createApp(config, db);
  const app2 = await createApp(config, db);

  try {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const passwordHash = "dummy-hash";

    await db.query(
      "INSERT INTO users(id, email, name, password_hash) VALUES($1, $2, 'Test', $3)",
      [userId, `user-${randomUUID()}@example.com`, passwordHash],
    );
    await db.query(
      "INSERT INTO workspaces(id, owner_id, settings, trial_until) VALUES($1, $2, '{}', $3)",
      [workspaceId, userId, Date.now() + 86400000],
    );

    const jobId = `test-lease-${randomUUID()}`;

    // Insert a job leased by instance 1 in the past (simulate killed instance)
    await db.query(
      "INSERT INTO jobs(id, workspace_id, kind, payload, state, attempts, available_at, lease_until) VALUES($1, $2, 'sales-task', '{}', 'processing', 1, $3, $4)",
      [jobId, workspaceId, Date.now() - 10000, Date.now() - 5000],
    );

    // Worker on instance 2 polls and claims the stranded job
    const claimed = await app2.worker.once();
    assert.equal(claimed, true);

    // Verify job state on DB is updated by instance 2
    const [job] = await db.query("SELECT state FROM jobs WHERE id=$1", [jobId]);
    assert.equal(job.state, "done");
  } finally {
    await app1.service.close();
    await app2.service.close();
  }
});
