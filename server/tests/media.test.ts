import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { MetaProvider, ProviderError } from "../providers.ts";

const config: Config = {
  production: false,
  port: 3002,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3002",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "cd".repeat(32),
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
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
  metricsToken: "internal-test-token",
};

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

class MediaFakeMeta extends MetaProvider {
  async downloadMedia(
    media: { id?: string; url?: string; mimeType?: string; filename?: string },
    _token: string,
  ) {
    if (media.id === "oversized-id" || media.url?.includes("oversized")) {
      throw new ProviderError("Media file exceeds maximum allowed size of 10MB.");
    }
    if (media.mimeType === "video/mp4" || media.id === "unsupported-id") {
      throw new ProviderError("Unsupported media MIME type: video/mp4");
    }
    if (media.id === "valid-image-id" || media.url?.includes("photo.png")) {
      return {
        buffer: Buffer.from("PNG_FAKE_IMAGE_DATA_1234567890"),
        mimeType: "image/png",
        filename: "photo.png",
      };
    }
    return super.downloadMedia(media, _token);
  }
}

async function fixture(database = db) {
  const meta = new MediaFakeMeta(config);
  const value = await createApp(config, database, { meta });
  const client = request.agent(value.app);
  const email = `${randomUUID()}@example.com`;
  const registered = await client
    .post("/api/auth/register")
    .set("Origin", config.appUrl)
    .send({ name: "Owner", businessName: "Media Studio", email, password });
  assert.equal(registered.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "put" | "delete", path: string) =>
    client[method](path)
      .set("Origin", config.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  return { ...value, meta, client, snapshot, email, mutate };
}

test("cross-tenant denial: workspace member cannot access another workspace's media file", async () => {
  const tenantA = await fixture();
  const tenantB = await fixture();

  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await tenantA.service.connect(
    tenantA.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Studio A",
    "test-token",
  );

  // Ingest image message for tenant A
  await tenantA.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15550001111",
    providerId: randomUUID(),
    name: "Customer A",
    text: "[Photo received]",
    timestamp: Date.now(),
    reviewOnly: true,
    media: {
      id: "valid-image-id",
      mimeType: "image/png",
      filename: "photo.png",
    },
  });

  const snapshotA = (await tenantA.client.get("/api/bootstrap")).body;
  assert.equal(snapshotA.conversations.length, 1);
  const messageA = snapshotA.conversations[0].messages[0];
  assert.ok(messageA.media);
  const mediaId = messageA.media.id;
  assert.ok(mediaId);

  // Tenant A owner can view the media
  const resA = await tenantA.client.get(`/api/media/${mediaId}`);
  assert.equal(resA.status, 200);
  assert.equal(resA.headers["content-type"], "image/png");
  assert.equal(resA.body.toString(), "PNG_FAKE_IMAGE_DATA_1234567890");

  // Tenant B owner attempts to view Tenant A's media file -> 404 / cross-tenant denial
  const resB = await tenantB.client.get(`/api/media/${mediaId}`);
  assert.equal(resB.status, 404);
  assert.match(resB.body.error, /not found or access denied/i);

  // Unauthenticated request -> 401
  const unauthRes = await request(tenantA.app).get(`/api/media/${mediaId}`);
  assert.equal(unauthRes.status, 401);
});

test("size cap: oversized media is rejected before DB storage", async () => {
  const f = await fixture();
  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await f.service.connect(
    f.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Studio Size Test",
    "test-token",
  );

  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15550002222",
    providerId: randomUUID(),
    name: "Customer Oversized",
    text: "[Large video/file received]",
    timestamp: Date.now(),
    reviewOnly: true,
    media: {
      id: "oversized-id",
      mimeType: "image/jpeg",
      filename: "huge.jpg",
    },
  });

  // Verify that message exists but media was NOT stored in media_files
  const snapshot = (await f.client.get("/api/bootstrap")).body;
  assert.equal(snapshot.conversations.length, 1);
  const msg = snapshot.conversations[0].messages[0];
  assert.equal(msg.media, null);

  const storedFiles = await db.query(
    "SELECT * FROM media_files WHERE workspace_id=$1",
    [f.snapshot.workspace.id],
  );
  assert.equal(storedFiles.length, 0);
});

test("MIME allowlist: unsupported media type is rejected before DB storage", async () => {
  const f = await fixture();
  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await f.service.connect(
    f.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Studio MIME Test",
    "test-token",
  );

  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15550003333",
    providerId: randomUUID(),
    name: "Customer Video",
    text: "[Video received]",
    timestamp: Date.now(),
    reviewOnly: true,
    media: {
      id: "unsupported-id",
      mimeType: "video/mp4",
      filename: "clip.mp4",
    },
  });

  // Verify media was NOT stored in media_files
  const snapshot = (await f.client.get("/api/bootstrap")).body;
  assert.equal(snapshot.conversations.length, 1);
  const msg = snapshot.conversations[0].messages[0];
  assert.equal(msg.media, null);

  const storedFiles = await db.query(
    "SELECT * FROM media_files WHERE workspace_id=$1",
    [f.snapshot.workspace.id],
  );
  assert.equal(storedFiles.length, 0);
});

test("outbound refusal: outbound media attempt is refused with explicit reason", async () => {
  const f = await fixture();
  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await f.service.connect(
    f.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Studio Outbound Test",
    "test-token",
  );

  // Ingest text message to open conversation
  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15550004444",
    providerId: randomUUID(),
    name: "Customer Outbound",
    text: "Can you send me your catalog image?",
    timestamp: Date.now(),
    reviewOnly: false,
  });

  const snapshot = (await f.client.get("/api/bootstrap")).body;
  const conversationId = snapshot.conversations[0].id;

  // Attempt sending outbound media via API with mediaUrl
  const attempt1 = await f
    .mutate("post", `/api/conversations/${conversationId}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Here is our catalog",
      mediaUrl: "https://example.com/catalog.jpg",
    });
  assert.equal(attempt1.status, 400);
  assert.match(attempt1.body.error, /Outbound media is blocked until Meta template policy approval/);

  // Attempt sending outbound media via API with media payload object
  const attempt2 = await f
    .mutate("post", `/api/conversations/${conversationId}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Here is our photo",
      media: { url: "https://example.com/photo.jpg" },
    });
  assert.equal(attempt2.status, 400);
  assert.match(attempt2.body.error, /Outbound media is blocked until Meta template policy approval/);

  // Attempt direct service queueMessage with hasMedia flag
  await assert.rejects(
    f.service.queueMessage(
      f.snapshot.workspace.id,
      f.snapshot.user.id,
      conversationId,
      "Here is an image",
      randomUUID(),
      undefined,
      false,
      true, // hasMedia = true
    ),
    (err: any) =>
      err.status === 400 &&
      /Outbound media is blocked until Meta template policy approval/.test(err.message),
  );
});
