import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { MetaProvider, ProviderError } from "../providers.ts";
import { decrypt, digest } from "../security.ts";

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
  metaAppId: "88888888",
  metaSecret: "meta-wa-secret-key",
  instagramAppId: "12345678",
  instagramSecret: "instagram-test-secret",
  verifyToken: "verify-wa-test",
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

class FakeMetaProvider extends MetaProvider {
  async exchangeWhatsApp(code: string) {
    if (code === "expired-code") {
      throw new ProviderError("The authorization code has expired.", false, false, true);
    }
    if (code === "invalid-code") {
      throw new ProviderError("Invalid authorization code.");
    }
    return {
      accountId: "555123456789",
      label: "Studio WhatsApp Line",
      token: "secret-wa-access-token-999",
      expiresAt: Date.now() + 86400000,
    };
  }
}

async function fixture(overrides: Partial<Config> = {}, database = db) {
  const cfg = { ...config, ...overrides };
  const meta = new FakeMetaProvider(cfg);
  const value = await createApp(cfg, database, { meta });
  const client = request.agent(value.app);
  const email = `${randomUUID()}@example.com`;
  const registered = await client
    .post("/api/auth/register")
    .set("Origin", cfg.appUrl)
    .send({ name: "Owner", businessName: "Studio", email, password });
  assert.equal(registered.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "put" | "delete", path: string) =>
    client[method](path)
      .set("Origin", cfg.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  return { ...value, meta, client, cfg, snapshot, email, mutate };
}

test("WhatsApp Embedded Signup exchange success and encrypted token storage at rest", async () => {
  const f = await fixture();
  const start = await f.mutate("post", "/api/integrations/whatsapp/start").send({});
  assert.equal(start.status, 200);
  assert.ok(start.body.url);

  const startUrl = new URL(start.body.url);
  assert.equal(startUrl.searchParams.get("client_id"), f.cfg.metaAppId);
  const state = startUrl.searchParams.get("state");
  assert.ok(state);

  const callback = await f.client
    .get("/api/integrations/whatsapp/callback")
    .query({ state, code: "valid-wa-code" });

  assert.equal(callback.status, 302);
  assert.match(callback.headers.location, /connection=connected/);

  // Connection should exist in DB
  const [connection] = await db.query(
    "SELECT * FROM connections WHERE workspace_id=$1 AND platform='whatsapp'",
    [f.snapshot.workspace.id],
  );
  assert.ok(connection);
  assert.equal(connection.account_id, "555123456789");
  assert.equal(connection.label, "Studio WhatsApp Line");
  assert.equal(connection.status, "connected");

  // Token is encrypted at rest in token_cipher and never stored as plaintext
  assert.ok(!connection.token_cipher.includes("secret-wa-access-token-999"));
  assert.equal(
    decrypt(connection.token_cipher, f.cfg.encryptionKey),
    "secret-wa-access-token-999",
  );

  // State token single-use check
  const consumedToken = await db.query(
    "SELECT hash FROM tokens WHERE hash=$1 AND purpose='whatsapp'",
    [digest(state!)],
  );
  assert.equal(consumedToken.length, 0);
});

test("WhatsApp Embedded Signup cancellation and denial leave workspace disconnected", async () => {
  const f = await fixture();
  const start = await f.mutate("post", "/api/integrations/whatsapp/start").send({});
  assert.equal(start.status, 200);

  const state = new URL(start.body.url).searchParams.get("state");
  assert.ok(state);

  const callback = await f.client
    .get("/api/integrations/whatsapp/callback")
    .query({ state, error: "access_denied", error_reason: "user_denied" });

  assert.equal(callback.status, 302);
  assert.match(callback.headers.location, /connection=cancelled/);

  const connections = await db.query(
    "SELECT id FROM connections WHERE workspace_id=$1 AND platform='whatsapp'",
    [f.snapshot.workspace.id],
  );
  assert.equal(connections.length, 0);

  // Token is consumed/cleared
  const consumedToken = await db.query(
    "SELECT hash FROM tokens WHERE hash=$1 AND purpose='whatsapp'",
    [digest(state!)],
  );
  assert.equal(consumedToken.length, 0);
});

test("WhatsApp Embedded Signup rejects expired or missing state tokens", async () => {
  const f = await fixture();

  const callback = await f.client
    .get("/api/integrations/whatsapp/callback")
    .query({ state: "expired-or-unknown-state", code: "valid-wa-code" });

  assert.equal(callback.status, 400);

  const connections = await db.query(
    "SELECT id FROM connections WHERE workspace_id=$1 AND platform='whatsapp'",
    [f.snapshot.workspace.id],
  );
  assert.equal(connections.length, 0);
});

test("WhatsApp Embedded Signup redirects to failure state on code exchange error", async () => {
  const f = await fixture();
  const start = await f.mutate("post", "/api/integrations/whatsapp/start").send({});
  const state = new URL(start.body.url).searchParams.get("state");

  const callback = await f.client
    .get("/api/integrations/whatsapp/callback")
    .query({ state, code: "expired-code" });

  assert.equal(callback.status, 302);
  assert.match(callback.headers.location, /connection=failed/);

  const connections = await db.query(
    "SELECT id FROM connections WHERE workspace_id=$1 AND platform='whatsapp'",
    [f.snapshot.workspace.id],
  );
  assert.equal(connections.length, 0);
});

test("WhatsApp Embedded Signup fails explicitly when server credentials are absent", async () => {
  const f = await fixture({ metaAppId: undefined });
  assert.equal(f.snapshot.capabilities.whatsapp, false);

  const response = await f.mutate("post", "/api/integrations/whatsapp/start").send({});
  assert.equal(response.status, 503);
  assert.match(response.body.error, /WhatsApp login is not configured/);
});
