import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
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

test("a request log carries its id and omits PII, and queued jobs inherit the trace", async () => {
  const { app } = await createApp(config, db);
  const lines: string[] = [];
  const consoleLog = console.log;
  const consoleError = console.error;
  console.log = (line: unknown) => void lines.push(String(line));
  console.error = (line: unknown) => void lines.push(String(line));
  try {
    const email = `trace-${randomUUID()}@example.com`;
    const password = "correct horse battery staple";
    const register = await request(app)
      .post("/api/auth/register")
      .set("Origin", config.appUrl)
      .send({ email, password, name: "Trace", businessName: "Trace Co" });
    assert.equal(register.status, 201);
    assert.ok(register.headers["x-request-id"]);

    const recover = await request(app)
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

    const entry = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .find(
        (item) =>
          item?.event === "http" &&
          item?.path === "/api/auth/recover" &&
          item?.requestId === requestId,
      );
    assert.ok(entry, "the request log line is missing");
    assert.match(entry.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(entry.status, 200);

    const output = lines.join("\n");
    assert.ok(!output.includes(email), "email leaked into logs");
    assert.ok(!output.includes(password), "password leaked into logs");
  } finally {
    console.log = consoleLog;
    console.error = consoleError;
  }
});
