import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { FlagProvider } from "../flags.ts";

const config: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiKey: "test-key",
  openaiModel: "fake-model",
  aiTimeout: 1000,
  workerConcurrency: 1,
  workerKinds: [],
  workerEnabled: false,
  graphVersion: "v26.0",
  metaSecret: "test-secret",
  instagramSecret: "test-secret",
  verifyToken: "test-token",
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

const password = "password for feature flags test suite";

async function createFixture(database = db) {
  const flags = new FlagProvider(config, database);
  const fakeAI = {
    generate: async () => ({
      text: "The linen set is $80.",
      intent: "buy" as const,
      confidence: 95,
      safe: true,
      reason: "Approved catalog facts",
      evidence: ["The linen set is $80."],
      memory: "Wants olive linen set",
    }),
  };
  const value = await createApp(config, database, { ai: fakeAI });
  const client = request.agent(value.app);
  const email = `flags-${randomUUID()}@example.com`;
  const reg = await client
    .post("/api/auth/register")
    .set("Origin", config.appUrl)
    .send({ email, password, name: "Owner", businessName: "Flag Studio" });
  assert.equal(reg.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "delete", path: string) =>
    client[method](path)
      .set("Origin", config.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  return { ...value, client, snapshot, mutate, flags, email };
}

test("flags default to off when unset", async () => {
  const flags = new FlagProvider(config, db);
  // Clear process env overrides if present
  delete process.env.FLAGS_AUTOMATION_ENABLED;
  delete process.env.AUTOMATION_ENABLED;
  delete process.env.FLAGS_REVENUE_ENABLED;
  delete process.env.REVENUE_ENABLED;
  delete process.env.FLAGS_PILOT_WORKSPACES;
  delete process.env.PILOT_WORKSPACES;

  const auto = await flags.isAutomationEnabled("ws-1", db);
  const rev = await flags.isRevenueEnabled("ws-1", db);
  const pilot = await flags.getFlag("pilot.workspaces", [], db);

  assert.equal(auto, false);
  assert.equal(rev, false);
  assert.deepEqual(pilot, []);
});

test("automation kill switch blocks auto-send with an audit reason", async () => {
  const f = await createFixture();
  const workspaceId = f.snapshot.workspace.id;

  // Turn settings auto-reply on and conversation auto-send on
  await f.mutate("patch", "/api/settings").send({
    autoReplyEnabled: true,
    businessDescription: "The linen set is $80.",
    productsSold: "Linen sets",
  });

  const accountId = `account-${randomUUID()}`;
  await f.service.connect(workspaceId, "whatsapp", accountId, "Test Account", "token");
  const messageId = randomUUID();
  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15559998888",
    providerId: messageId,
    name: "Customer",
    text: "Can I buy the linen set?",
    timestamp: Date.now(),
    reviewOnly: false,
  });

  const conversation = (await f.client.get("/api/bootstrap")).body.conversations[0];
  await f.mutate("patch", `/api/conversations/${conversation.id}`).send({ autoSend: true });

  // Generate suggestion
  await f.service.generate(workspaceId, conversation.id, conversation.messages[0].id);

  // 1. With automation.enabled flag OFF (default or explicit false), autoAllowed MUST return false and audit
  await f.service.flags.setFlag("automation.enabled", false, db);
  const convRow = (await db.query("SELECT * FROM conversations WHERE id=$1", [conversation.id]))[0];

  const allowedOff = await f.service.autoAllowed(db, workspaceId, convRow, conversation.messages[0].id);
  assert.equal(allowedOff, false);

  const auditRows = await db.query(
    "SELECT action, detail FROM audit_events WHERE workspace_id=$1 AND action='automation.blocked' ORDER BY created_at DESC LIMIT 1",
    [workspaceId],
  );
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].detail.reason, "automation.enabled flag is off");

  // 2. Enable automation.enabled
  await f.service.flags.setFlag("automation.enabled", true, db);
  const allowedOn = await f.service.autoAllowed(db, workspaceId, convRow, conversation.messages[0].id);
  assert.equal(allowedOn, true);

  // 3. Environment variable Kill Switch override stops auto-send immediately without deploy
  process.env.FLAGS_AUTOMATION_ENABLED = "false";
  const allowedKillSwitch = await f.service.autoAllowed(db, workspaceId, convRow, conversation.messages[0].id);
  assert.equal(allowedKillSwitch, false);
  delete process.env.FLAGS_AUTOMATION_ENABLED;
});

test("pilot cohort gating restricts Revenue navigation and API routes", async () => {
  const pilotFixture = await createFixture();
  const nonPilotFixture = await createFixture();

  const pilotWsId = pilotFixture.snapshot.workspace.id;
  const nonPilotWsId = nonPilotFixture.snapshot.workspace.id;

  // Turn revenue.enabled ON globally, but set pilot.workspaces cohort to pilotWsId
  await pilotFixture.flags.setFlag("revenue.enabled", true, db);
  await pilotFixture.flags.setFlag("pilot.workspaces", [pilotWsId], db);

  // 1. Pilot workspace sees Revenue enabled in bootstrap
  const pilotBootstrap = (await pilotFixture.client.get("/api/bootstrap")).body;
  assert.equal(pilotBootstrap.flags.revenueEnabled, true);
  assert.equal(pilotBootstrap.capabilities.revenue, true);

  const pilotRevenueRes = await pilotFixture.client.get("/api/revenue");
  assert.equal(pilotRevenueRes.status, 200);

  // 2. Non-pilot workspace sees Revenue disabled in bootstrap
  const nonPilotBootstrap = (await nonPilotFixture.client.get("/api/bootstrap")).body;
  assert.equal(nonPilotBootstrap.flags.revenueEnabled, false);
  assert.equal(nonPilotBootstrap.capabilities.revenue, false);

  const nonPilotRevenueRes = await nonPilotFixture.client.get("/api/revenue");
  assert.equal(nonPilotRevenueRes.status, 403);
});
