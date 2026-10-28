import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import type { Config } from "../config.ts";
import {
  Analytics,
  eventProperties,
  type AnalyticsClient,
  type AnalyticsEvent,
} from "../analytics.ts";

const config = { analyticsEnabled: true, posthogKey: "test-key" } as Config;
let db: Database;
let workspaceId: string;
let userId: string;

before(async () => {
  db = await createDatabase({
    databaseUrl: process.env.TEST_DATABASE_URL,
    dataDir: ":memory:",
    databaseSsl: false,
  } as Config);
  userId = randomUUID();
  workspaceId = randomUUID();
  await db.query(
    "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,'Owner','hash')",
    [userId, `${userId}@example.com`],
  );
  await db.query(
    "INSERT INTO workspaces(id,owner_id,settings,trial_until) VALUES($1,$2,$3,$4)",
    [workspaceId, userId, '{"analyticsConsent":true}', Date.now() + 86400000],
  );
});
after(async () => {
  await db.close();
});

function fake() {
  const sent: Parameters<AnalyticsClient["capture"]>[0][] = [];
  return {
    sent,
    client: { capture: (message: (typeof sent)[number]) => sent.push(message) },
  };
}
test("every event keeps only its allowlisted properties and hashes the workspace", async () => {
  const { sent, client } = fake();
  const analytics = new Analytics(config, client);
  const cases: [AnalyticsEvent, Record<string, string | number | boolean>][] = [
    ["signup", {}],
    ["workspace_created", { plan: "trial", industry: "general" }],
    ["channel_connected", { platform: "whatsapp" }],
    ["draft_generated", { intent: "buy", confidence: 90, safe: true }],
    ["reply_sent", { platform: "instagram", automatic: true }],
    ["outcome_recorded", { stage: "won" }],
  ];
  for (const [event, properties] of cases) {
    await analytics.capture(db, workspaceId, event, {
      ...properties,
      email: "leak@example.com",
      phone: "+15551234567",
      text: "customer message",
      token: "secret-token",
    });
    const last = sent[sent.length - 1];
    assert.equal(last.event, event);
    assert.deepEqual(last.properties, properties);
    assert.match(last.distinctId, /^[0-9a-f]{16}$/);
    assert.notEqual(last.distinctId, workspaceId);
  }
  const payload = JSON.stringify(sent);
  for (const forbidden of [
    "leak@example.com",
    "+15551234567",
    "customer message",
    "secret-token",
    "email",
    "phone",
    "token",
  ])
    assert.ok(!payload.includes(forbidden), forbidden);
});
test("consent off and the kill switch both stop capture", async () => {
  const { sent, client } = fake();
  await db.query(
    "UPDATE workspaces SET settings='{}'::jsonb WHERE id=$1",
    [workspaceId],
  );
  await new Analytics(config, client).capture(db, workspaceId, "signup");
  assert.equal(sent.length, 0);

  await db.query(
    "UPDATE workspaces SET settings='{\"analyticsConsent\":true}'::jsonb WHERE id=$1",
    [workspaceId],
  );
  await new Analytics(
    { ...config, analyticsEnabled: false },
    client,
  ).capture(db, workspaceId, "signup");
  assert.equal(sent.length, 0);
});
test("the taxonomy is closed", () => {
  for (const [event, allowed] of Object.entries(eventProperties)) {
    assert.ok(event.length > 0);
    assert.ok(Array.isArray(allowed));
  }
});
test("capture failures never throw and shutdown is forwarded", async () => {
  let shut = false;
  const client: AnalyticsClient = {
    capture() {
      throw new Error("posthog down");
    },
    shutdown() {
      shut = true;
    },
  };
  const analytics = new Analytics(config, client);
  await assert.doesNotReject(() =>
    analytics.capture(db, workspaceId, "signup"),
  );
  await assert.doesNotReject(() =>
    analytics.capture(
      { query: async () => { throw new Error("db down"); } } as unknown as Database,
      workspaceId,
      "signup",
    ),
  );
  analytics.shutdown();
  assert.equal(shut, true);
});
