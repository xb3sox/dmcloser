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
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
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

class FakeMetaProvider extends MetaProvider {
  sent: {
    platform: string;
    accountId: string;
    recipient: string;
    text: string;
    localId: string;
    template?: any;
  }[] = [];

  async send(
    platform: string,
    accountId: string,
    recipient: string,
    token: string,
    text: string,
    localId: string,
    template?: any,
  ) {
    this.sent.push({
      platform,
      accountId,
      recipient,
      text,
      localId,
      template,
    });
    return `fake-msg-${localId}`;
  }
}

async function fixture(overrides: Partial<Config> = {}) {
  const cfg = { ...config, ...overrides };
  const meta = new FakeMetaProvider(cfg);
  const value = await createApp(cfg, db, { meta });
  const client = request.agent(value.app);
  const email = `${randomUUID()}@example.com`;
  const registered = await client
    .post("/api/auth/register")
    .set("Origin", cfg.appUrl)
    .send({
      name: "Owner",
      businessName: "Linen Studio",
      email,
      password: "correct horse battery staple",
    });
  assert.equal(registered.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "put" | "delete", path: string) =>
    client[method](path)
      .set("Origin", cfg.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  return { ...value, meta, client, cfg, snapshot, mutate };
}

async function createConversation(
  f: Awaited<ReturnType<typeof fixture>>,
  age = 0,
) {
  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await f.service.connect(
    f.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Test WhatsApp",
    "test-provider-token",
  );
  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15551112222",
    providerId: randomUUID(),
    name: "Alex",
    text: "Hello",
    timestamp: Date.now() - age,
    reviewOnly: false,
  });
  const snapshot = (await f.client.get("/api/bootstrap")).body;
  return snapshot.conversations[0];
}

test("outside the 24-hour window, freeform send is refused with a specific reason", async () => {
  const f = await fixture();
  // Conversation created 25 hours ago -> outside the 24-hour window
  const conversation = await createConversation(f, 25 * 3600 * 1000);

  const response = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({ text: "Freeform message outside window" });

  assert.equal(response.status, 409);
  assert.match(
    response.body.error,
    /24-hour reply window is closed/i,
  );
  assert.match(
    response.body.error,
    /freeform messages outside the window are blocked/i,
  );
  assert.equal(f.meta.sent.length, 0);
});

test("an approved template sends with typed parameters outside the 24-hour window", async () => {
  const f = await fixture();
  const conversation = await createConversation(f, 25 * 3600 * 1000);

  // Register an approved template
  await f
    .mutate("post", "/api/templates")
    .send({
      name: "order_update",
      locale: "en",
      status: "approved",
      parameterSchema: [
        { name: "customer_name", type: "string", required: true },
        { name: "order_id", type: "number", required: true },
      ],
    });

  const response = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Hello Alex, your order #12345 is ready.",
      template: {
        name: "order_update",
        locale: "en",
        parameters: {
          customer_name: "Alex",
          order_id: 12345,
        },
      },
    });

  assert.equal(response.status, 202);
  await f.service.deliver(f.snapshot.workspace.id, response.body.id);

  assert.equal(f.meta.sent.length, 1);
  assert.equal(f.meta.sent[0].template.name, "order_update");
  assert.equal(f.meta.sent[0].template.locale, "en");
  assert.deepEqual(f.meta.sent[0].template.parameters, {
    customer_name: "Alex",
    order_id: 12345,
  });
});

test("an unapproved or unknown template is refused", async () => {
  const f = await fixture();
  const conversation = await createConversation(f, 25 * 3600 * 1000);

  // Register a pending template
  await f
    .mutate("post", "/api/templates")
    .send({
      name: "pending_template",
      locale: "en",
      status: "pending",
      parameterSchema: [],
    });

  // Try unknown template
  const unknownResponse = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Sending unknown template",
      template: {
        name: "non_existent_template",
        locale: "en",
        parameters: {},
      },
    });

  assert.equal(unknownResponse.status, 400);
  assert.match(unknownResponse.body.error, /Unknown template/i);

  // Try unapproved (pending) template
  const unapprovedResponse = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Sending pending template",
      template: {
        name: "pending_template",
        locale: "en",
        parameters: {},
      },
    });

  assert.equal(unapprovedResponse.status, 400);
  assert.match(unapprovedResponse.body.error, /Template is not approved/i);
  assert.equal(f.meta.sent.length, 0);
});

test("parameter mismatch in template is refused", async () => {
  const f = await fixture();
  const conversation = await createConversation(f, 25 * 3600 * 1000);

  await f
    .mutate("post", "/api/templates")
    .send({
      name: "discount_offer",
      locale: "en",
      status: "approved",
      parameterSchema: [
        { name: "code", type: "string", required: true },
        { name: "percent", type: "number", required: true },
      ],
    });

  // Missing required parameter 'percent'
  const missingParamResponse = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Discount code SAVE20",
      template: {
        name: "discount_offer",
        locale: "en",
        parameters: { code: "SAVE20" },
      },
    });

  assert.equal(missingParamResponse.status, 400);
  assert.match(
    missingParamResponse.body.error,
    /missing required parameter 'percent'/i,
  );

  // Invalid parameter type for 'percent' (string instead of number)
  const invalidTypeResponse = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Discount code SAVE20",
      template: {
        name: "discount_offer",
        locale: "en",
        parameters: { code: "SAVE20", percent: "20%" },
      },
    });

  assert.equal(invalidTypeResponse.status, 400);
  assert.match(
    invalidTypeResponse.body.error,
    /'percent' must be a number/i,
  );
  assert.equal(f.meta.sent.length, 0);
});

test("opt-out still blocks every template send", async () => {
  const f = await fixture();
  const conversation = await createConversation(f);

  // Contact sends opt-out message
  const [connection] = await db.query(
    "SELECT account_id FROM connections WHERE workspace_id=$1",
    [f.snapshot.workspace.id],
  );
  await f.service.ingest({
    platform: "whatsapp",
    accountId: connection.account_id,
    externalId: "15551112222",
    providerId: randomUUID(),
    name: "Alex",
    text: "unsubscribe",
    timestamp: Date.now(),
    reviewOnly: false,
  });

  // Register an approved template
  await f
    .mutate("post", "/api/templates")
    .send({
      name: "welcome_back",
      locale: "en",
      status: "approved",
      parameterSchema: [],
    });

  const response = await f
    .mutate("post", `/api/conversations/${conversation.id}/messages`)
    .set("Idempotency-Key", randomUUID())
    .send({
      text: "Welcome back!",
      template: {
        name: "welcome_back",
        locale: "en",
        parameters: {},
      },
    });

  assert.equal(response.status, 409);
  assert.match(response.body.error, /contact has opted out/i);
  assert.equal(f.meta.sent.length, 0);
});
