import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalyticsService, assertNoPII, hashWorkspaceId, type AnalyticsEventName } from "../analytics.ts";
import type { Config } from "../config.ts";

const mockConfig: Config = {
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
  posthogApiKey: "phc_test_key_12345",
  posthogHost: "https://us.i.posthog.com",
  posthogEnabled: true,
};

test("analytics consent gate: no event is sent before consent", async () => {
  const analytics = new AnalyticsService(mockConfig);
  const result = await analytics.capture("signup", "ws_12345", false, {});
  assert.equal(result, null);
});

test("analytics kill switch: disabling the flag stops all capture", async () => {
  const disabledConfig: Config = { ...mockConfig, posthogEnabled: false };
  const analytics = new AnalyticsService(disabledConfig);
  const result = await analytics.capture("signup", "ws_12345", true, {});
  assert.equal(result, null);
});

test("analytics distinct_id is a server-side hashed workspace id", async () => {
  const analytics = new AnalyticsService(mockConfig);
  const workspaceId = "ws_test_workspace_99";
  const expectedHash = hashWorkspaceId(workspaceId);
  assert.notEqual(expectedHash, workspaceId);
  assert.equal(expectedHash.length, 64); // SHA-256 hex length

  const payload = await analytics.capture("workspace_created", workspaceId, true, {});
  assert.notEqual(payload, null);
  assert.equal(payload?.distinct_id, expectedHash);
});

test("PII guardrail assertions reject emails, phones, message bodies, and tokens", () => {
  // Valid safe property object
  assert.doesNotThrow(() => {
    assertNoPII({
      platform: "instagram",
      latencyMs: 120,
      safe: true,
      confidence: 95,
      automatic: false,
      sender: "user",
      outcome: "won",
      reason: "price_fit",
    });
  });

  // Forbidden keys
  const forbiddenKeys = [
    { email: "user@example.com" },
    { userEmail: "test@domain.com" },
    { phone: "+15550199" },
    { phoneNumber: "0501234567" },
    { message: "Hello world" },
    { messageBody: "Sensitive content" },
    { text: "Inbound text" },
    { body: "Payload body" },
    { token: "secret_token_val" },
    { secretKey: "abc" },
    { bearerToken: "xyz" },
  ];

  for (const obj of forbiddenKeys) {
    assert.throws(
      () => assertNoPII(obj),
      /PII Violation: Key '.*' is forbidden by PII guardrails\./,
    );
  }

  // Forbidden string values (like raw email addresses in values)
  const forbiddenValues = [
    { detail: "Contact me at alice@example.com for quotes" },
    { note: "Call +12345678901 for support" },
    { credentialValue: "Bearer secret_jwt_token_here" },
  ];

  for (const obj of forbiddenValues) {
    assert.throws(
      () => assertNoPII(obj),
      /PII Violation: String at '.*' contains potential sensitive data/,
    );
  }
});

test("snapshots each event payload and asserts it contains no email, phone, message body or token", async () => {
  const analytics = new AnalyticsService(mockConfig);
  const workspaceId = "ws_snapshot_test";
  const consent = true;

  const eventsToTest: Array<{ event: AnalyticsEventName; properties: Record<string, unknown> }> = [
    {
      event: "signup",
      properties: {},
    },
    {
      event: "workspace_created",
      properties: {},
    },
    {
      event: "channel_connected",
      properties: { platform: "instagram" },
    },
    {
      event: "draft_generated",
      properties: { latencyMs: 240, safe: true, confidence: 92 },
    },
    {
      event: "reply_sent",
      properties: { automatic: false, sender: "user" },
    },
    {
      event: "outcome_recorded",
      properties: { outcome: "won", reason: "catalog_fit" },
    },
  ];

  const snapshots: Record<string, unknown> = {};

  for (const { event, properties } of eventsToTest) {
    const payload = await analytics.capture(event, workspaceId, consent, properties);
    assert.notEqual(payload, null);

    // Verify PII check passes explicitly
    assertNoPII(payload?.properties);

    // Assert payload keys and contents
    assert.equal(payload?.event, event);
    assert.equal(payload?.distinct_id, hashWorkspaceId(workspaceId));
    assert.equal(payload?.api_key, mockConfig.posthogApiKey);

    // Strict non-existence check for forbidden identifiers in serialized JSON
    const jsonStr = JSON.stringify(payload);
    assert.equal(/email/i.test(jsonStr), false, `Payload for ${event} contained forbidden word 'email'`);
    assert.equal(/phone/i.test(jsonStr), false, `Payload for ${event} contained forbidden word 'phone'`);
    assert.equal(/message/i.test(jsonStr), false, `Payload for ${event} contained forbidden word 'message'`);
    assert.equal(/body/i.test(jsonStr), false, `Payload for ${event} contained forbidden word 'body'`);
    assert.equal(/token/i.test(jsonStr), false, `Payload for ${event} contained forbidden word 'token'`);

    snapshots[event] = payload;
  }

  // Verify snapshot matches fixed taxonomy expectations exactly
  assert.deepEqual(snapshots, {
    signup: {
      api_key: "phc_test_key_12345",
      event: "signup",
      distinct_id: hashWorkspaceId(workspaceId),
      properties: { $process_person_profile: false },
    },
    workspace_created: {
      api_key: "phc_test_key_12345",
      event: "workspace_created",
      distinct_id: hashWorkspaceId(workspaceId),
      properties: { $process_person_profile: false },
    },
    channel_connected: {
      api_key: "phc_test_key_12345",
      event: "channel_connected",
      distinct_id: hashWorkspaceId(workspaceId),
      properties: { platform: "instagram", $process_person_profile: false },
    },
    draft_generated: {
      api_key: "phc_test_key_12345",
      event: "draft_generated",
      distinct_id: hashWorkspaceId(workspaceId),
      properties: { latencyMs: 240, safe: true, confidence: 92, $process_person_profile: false },
    },
    reply_sent: {
      api_key: "phc_test_key_12345",
      event: "reply_sent",
      distinct_id: hashWorkspaceId(workspaceId),
      properties: { automatic: false, sender: "user", $process_person_profile: false },
    },
    outcome_recorded: {
      api_key: "phc_test_key_12345",
      event: "outcome_recorded",
      distinct_id: hashWorkspaceId(workspaceId),
      properties: { outcome: "won", reason: "catalog_fit", $process_person_profile: false },
    },
  });
});
