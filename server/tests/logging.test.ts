import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import { MetaProvider } from "../providers.ts";
import { withTraceId } from "../trace.ts";
import type { Config } from "../config.ts";

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
  metaAppId: "12345678",
  metaSecret: "meta-test-secret",
  instagramAppId: "12345678",
  instagramSecret: "instagram-test-secret",
  verifyToken: "verify-this-test",
  prices: {},
  smtpHost: "smtp.test",
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
  rateLimitMax: 10000,
  authRateLimitMax: 10000,
  recoveryRateLimitMax: 10000,
  metricsToken: "internal-test-token",
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

function captureConsole() {
  const lines: string[] = [];
  const log = console.log;
  const error = console.error;
  console.log = (line: unknown) => void lines.push(String(line));
  console.error = (line: unknown) => void lines.push(String(line));
  return {
    lines,
    restore() {
      console.log = log;
      console.error = error;
    },
    records() {
      return lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    },
  };
}

test("request log carries the id and a workspace hash, and queued jobs inherit the trace", async () => {
  const { app } = await createApp(config, db);
  const capture = captureConsole();
  try {
    const agent = request.agent(app);
    const email = `trace-${randomUUID()}@example.com`;
    const password = "correct horse battery staple";
    const register = await agent
      .post("/api/auth/register")
      .set("Origin", config.appUrl)
      .send({ email, password, name: "Trace", businessName: "Trace Co" });
    assert.equal(register.status, 201);

    const bootstrap = await agent.get("/api/bootstrap");
    assert.equal(bootstrap.status, 200);
    const bootstrapId = bootstrap.headers["x-request-id"] as string;

    const [workspace] = await db.query(
      "SELECT w.id FROM workspaces w JOIN users u ON u.id=w.owner_id WHERE u.email=$1",
      [email],
    );
    const bootstrapLog = capture
      .records()
      .find(
        (item) =>
          item.event === "http" &&
          item.path === "/api/bootstrap" &&
          item.requestId === bootstrapId,
      );
    assert.ok(bootstrapLog, "the authenticated request log line is missing");
    assert.match(bootstrapLog.workspace, /^[0-9a-f]{12}$/);
    assert.notEqual(bootstrapLog.workspace, workspace.id);

    const recover = await agent
      .post("/api/auth/recover")
      .set("Origin", config.appUrl)
      .send({ email });
    assert.equal(recover.status, 200);
    const requestId = recover.headers["x-request-id"] as string;

    // The recover route awaits the enqueue, so the job must already carry the id.
    const jobs = await db.query(
      "SELECT kind,trace_id FROM jobs WHERE trace_id=$1",
      [requestId],
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].kind, "email");

    const entry = capture
      .records()
      .find(
        (item) =>
          item.event === "http" &&
          item.path === "/api/auth/recover" &&
          item.requestId === requestId,
      );
    assert.ok(entry, "the request log line is missing");
    assert.match(entry.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(entry.status, 200);

    const output = capture.lines.join("\n");
    assert.ok(!output.includes(email), "email leaked into logs");
    assert.ok(!output.includes(password), "password leaked into logs");
  } finally {
    capture.restore();
  }
});

test("the worker poll loop and provider failures carry the queued trace", async () => {
  const { app, service, worker } = await createApp(
    { ...config, smtpHost: undefined },
    db,
  );
  const capture = captureConsole();
  try {
    const email = `worker-${randomUUID()}@example.com`;
    const register = await request(app)
      .post("/api/auth/register")
      .set("Origin", config.appUrl)
      .send({
        email,
        password: "correct horse battery staple",
        name: "Worker",
        businessName: "Worker Co",
      });
    assert.equal(register.status, 201);
    const [workspace] = await db.query(
      "SELECT w.id FROM workspaces w JOIN users u ON u.id=w.owner_id WHERE u.email=$1",
      [email],
    );

    const trace = randomUUID();
    const jobId = `worker-${trace}`;
    await withTraceId(trace, () =>
      service.enqueue(
        "email",
        {
          to: "worker@example.com",
          subject: "Trace probe",
          text: "Trace probe",
          purpose: "verify",
        },
        workspace.id,
        jobId,
        0,
      ),
    );

    worker.start();
    let attempts = 0;
    for (let attempt = 0; attempt < 40 && attempts === 0; attempt++) {
      const [row] = await db.query(
        "SELECT attempts FROM jobs WHERE id=$1",
        [jobId],
      );
      attempts = Number(row?.attempts ?? 0);
      if (attempts === 0)
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await worker.stop();
    assert.ok(attempts >= 1, "the worker poll loop never claimed the job");

    const failure = capture
      .records()
      .find((item) => item.event === "job.failure" && item.traceId === trace);
    assert.ok(failure, "job.failure is missing the trace id");

    const providerTrace = randomUUID();
    const meta = new MetaProvider(config, async () => {
      throw new TypeError("offline");
    });
    await withTraceId(providerTrace, async () => {
      await assert.rejects(() =>
        meta.send("whatsapp", "123456", "654321", "token", "hello", "local-1"),
      );
    });
    const provider = capture
      .records()
      .find(
        (item) =>
          item.event === "provider.unreachable" &&
          item.traceId === providerTrace,
      );
    assert.ok(provider, "provider.unreachable is missing the trace id");

    assert.ok(!capture.lines.join("\n").includes("worker@example.com"));
  } finally {
    capture.restore();
  }
});
