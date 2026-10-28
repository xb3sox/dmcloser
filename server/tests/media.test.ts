import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { MetaProvider } from "../providers.ts";
import type { AIInput, GeneratedReply } from "../ai.ts";

const config = {
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiKey: "test-configured",
  openaiModel: "fake-eval",
  workerEnabled: false,
  graphVersion: "v26.0",
  metaAppId: "12345678",
  metaSecret: "meta-test-secret",
  verifyToken: "verify-this-test",
  prices: {},
  smtpPort: 587,
  mailFrom: "test@example.com",
  rateLimitMax: 10000,
  authRateLimitMax: 10000,
  recoveryRateLimitMax: 10000,
} as Config;

const password = "correct horse battery staple";
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

class FakeMetaMedia extends MetaProvider {
  downloadPayload: { data: Buffer; mimeType: string } | null = null;
  downloadError: Error | null = null;

  async downloadMedia(): Promise<{ data: Buffer; mimeType: string }> {
    if (this.downloadError) throw this.downloadError;
    return (
      this.downloadPayload || {
        data: Buffer.from("fake-media-content"),
        mimeType: "image/jpeg",
      }
    );
  }
}

const fakeAI = {
  generate: async (_input: AIInput): Promise<GeneratedReply> => ({
    text: "Sample response",
    intent: "question",
    confidence: 90,
    safe: true,
    reason: "Approved.",
    evidence: [],
    memory: "",
  }),
};

async function fixture(overrides: Partial<Config> = {}) {
  const cfg = { ...config, ...overrides };
  const meta = new FakeMetaMedia(cfg);
  const value = await createApp(cfg, db, { meta, ai: fakeAI });
  const client = request.agent(value.app);
  const email = `${randomUUID()}@example.com`;
  const registered = await client
    .post("/api/auth/register")
    .set("Origin", cfg.appUrl)
    .send({ name: "Owner", businessName: "Media Studio", email, password });
  assert.equal(registered.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "put" | "delete", path: string) =>
    client[method](path)
      .set("Origin", cfg.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  return { ...value, meta, client, cfg, snapshot, email, mutate };
}

test("inbound media store and retrieval for authorized owner", async () => {
  const f = await fixture();
  const sampleImage = Buffer.from("sample-jpg-image-data");
  const mediaId = await f.service.storeInboundMedia(f.snapshot.workspace.id, "image/jpeg", sampleImage);
  const res = await f.client.get(`/api/media/${mediaId}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "image/jpeg");
  assert.deepEqual(res.body, sampleImage);
});

test("cross-tenant media denial returns 404", async () => {
  const f1 = await fixture();
  const f2 = await fixture();

  const sampleImage = Buffer.from("tenant-1-image");
  const mediaId = await f1.service.storeInboundMedia(f1.snapshot.workspace.id, "image/png", sampleImage);
  const res = await f2.client.get(`/api/media/${mediaId}`);
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Media file not found.");
});

test("size cap: media exceeding 5 MB is rejected before storage", async () => {
  const f = await fixture();
  const oversizedData = Buffer.alloc(5 * 1024 * 1024 + 1);
  await assert.rejects(
    () => f.service.storeInboundMedia(f.snapshot.workspace.id, "image/jpeg", oversizedData),
    (err: any) => {
      assert.equal(err.status, 413);
      assert.match(err.message, /exceeds maximum allowed size of 5 MB/);
      return true;
    },
  );
});

test("MIME allowlist: unsupported media types are rejected before storage", async () => {
  const f = await fixture();
  const sampleExe = Buffer.from("binary-executable-content");
  await assert.rejects(
    () => f.service.storeInboundMedia(f.snapshot.workspace.id, "application/x-msdownload", sampleExe),
    (err: any) => {
      assert.equal(err.status, 415);
      assert.match(err.message, /Unsupported media type/);
      return true;
    },
  );
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  for (const mime of allowedMimes) {
    const id = await f.service.storeInboundMedia(f.snapshot.workspace.id, mime, Buffer.from("valid-data"));
    assert.ok(id);
  }
});

test("outbound media attempts are explicitly refused", async () => {
  const f = await fixture();
  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await f.service.connect(
    f.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Test business",
    "test-provider-token",
  );
  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15551112222",
    providerId: randomUUID(),
    name: "Alex",
    text: "Hello",
    timestamp: Date.now(),
    reviewOnly: false,
  });

  const snapshot = (await f.client.get("/api/bootstrap")).body;
  const conversationId = snapshot.conversations[0].id;

  const res = await f
    .mutate("post", `/api/conversations/${conversationId}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Sending an image",
      mediaUrl: "https://example.com/image.jpg",
    });

  assert.equal(res.status, 400);
  assert.equal(
    res.body.error,
    "Outbound media is unsupported until template policy is approved.",
  );
});
