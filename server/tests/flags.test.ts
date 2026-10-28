import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import { resolveFlags } from "../flags.ts";
import type { Config } from "../config.ts";

const config: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiModel: "fake",
  aiTimeout: 1000,
  workerConcurrency: 1,
  workerKinds: [],
  workerEnabled: false,
  graphVersion: "v26.0",
  prices: {},
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

test("the migration seeds the current behavior and an unset flag defaults off", async () => {
  const seeded = await resolveFlags(db, "workspace-a", {});
  assert.equal(seeded.automationEnabled, true);
  assert.equal(seeded.revenueEnabled, true);

  await db.query("DELETE FROM feature_flags");
  const unset = await resolveFlags(db, "workspace-a", {});
  assert.equal(unset.automationEnabled, false);
  assert.equal(unset.revenueEnabled, false);
});

test("the pilot list gates revenue and environment values win", async () => {
  await db.query("DELETE FROM feature_flags");
  await db.query(
    "INSERT INTO feature_flags(key,value) VALUES ('automation.enabled','true'::jsonb),('revenue.enabled','true'::jsonb),('pilot.workspaces','[\"workspace-b\"]'::jsonb)",
  );

  const outside = await resolveFlags(db, "workspace-a", {});
  assert.equal(outside.automationEnabled, true);
  assert.equal(outside.revenueEnabled, false);

  const inside = await resolveFlags(db, "workspace-b", {});
  assert.equal(inside.revenueEnabled, true);

  const forced = await resolveFlags(db, "workspace-a", {
    PILOT_WORKSPACES: "workspace-a",
  });
  assert.equal(forced.revenueEnabled, true);

  const killed = await resolveFlags(db, "workspace-b", {
    AUTOMATION_ENABLED: "false",
  });
  assert.equal(killed.automationEnabled, false);
});

test("the kill switch blocks automation and records a reason", async () => {
  const { service } = await createApp(config, db);
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const conversationId = randomUUID();
  await db.query(
    "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",
    [userId, `${userId}@example.com`, "Owner", "legacy-hash"],
  );
  await db.query(
    "INSERT INTO workspaces(id,owner_id,settings,trial_until) VALUES($1,$2,$3,$4)",
    [workspaceId, userId, "{}", Date.now() + 86400000],
  );
  await db.query(
    "INSERT INTO conversations(id,workspace_id,platform,external_id,name,last_at,window_until) VALUES($1,$2,'whatsapp',$3,'Lead',$4,$4)",
    [conversationId, workspaceId, randomUUID(), Date.now()],
  );
  await db.query("UPDATE feature_flags SET value='false'::jsonb WHERE key='automation.enabled'");

  const allowed = await service.autoAllowed(
    db,
    workspaceId,
    { id: conversationId },
    "source-1",
  );
  assert.equal(allowed, false);
  const audits = await db.query(
    "SELECT action,resource_id,detail FROM audit_events WHERE workspace_id=$1 AND action='automation.blocked'",
    [workspaceId],
  );
  assert.equal(audits.length, 1);
  assert.equal(audits[0].resource_id, "source-1");
  assert.equal(audits[0].detail.reason, "kill_switch");
});
