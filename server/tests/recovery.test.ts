import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { MetaProvider } from "../providers.ts";
import type { AIInput, GeneratedReply } from "../ai.ts";
import type { DealDetail } from "../../src/types/revenue.ts";

const config: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://127.0.0.1:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiKey: "test-only",
  openaiModel: "fake",
  aiTimeout: 1000,
  workerConcurrency: 1,
  workerKinds: [],
  workerEnabled: false,
  graphVersion: "v26.0",
  metaSecret: "test",
  instagramSecret: "test",
  verifyToken: "test",
  prices: {},
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
  posthogHost: "https://us.i.posthog.com",
  posthogEnabled: true,
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
const password = "a unique recovery test password";
async function fixture(database = db) {
  class FakeMeta extends MetaProvider {
    sent = 0;
    async send() {
      this.sent++;
      return randomUUID();
    }
  }
  let lastInput: AIInput | null = null;
  const meta = new FakeMeta(config);
  const value = await createApp(config, database, {
    meta,
    ai: {
      generate: async (input): Promise<GeneratedReply> => {
        lastInput = input;
        return {
          text: "The olive set is $80.",
          intent: "buy",
          confidence: 96,
          safe: true,
          reason: "Approved catalog",
          evidence: ["The olive set is $80."],
          memory: "Interested in linen.",
        };
      },
    },
  });
  const client = request.agent(value.app);
  const email = `recovery-${randomUUID()}@example.com`;
  const response = await client
    .post("/api/auth/register")
    .set("Origin", config.appUrl)
    .send({ email, password, name: "Owner", businessName: "Recovery Studio" });
  assert.equal(response.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "delete", path: string) =>
    client[method](path)
      .set("Origin", config.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  const accountId = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  await value.service.connect(
    snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Recovery tests",
    "fake-provider-token",
  );
  return {
    ...value,
    client,
    snapshot,
    mutate,
    accountId,
    meta,
    input: () => lastInput,
    database,
  };
}
/** Ingests a lead whose last customer message is `days` old. */
async function lead(
  f: Awaited<ReturnType<typeof fixture>>,
  days: number,
  text = "I am ready to buy the olive set today.",
): Promise<DealDetail> {
  const externalId = randomUUID();
  await f.service.ingest({
    platform: "whatsapp",
    accountId: f.accountId,
    externalId,
    providerId: randomUUID(),
    name: `Lead ${days}`,
    text,
    timestamp: Date.now() - days * 86400000,
    reviewOnly: false,
  });
  const [row] = await f.database.query(
    "SELECT id FROM conversations WHERE workspace_id=$1 AND external_id=$2",
    [f.snapshot.workspace.id, externalId],
  );
  const result = await f.client.get(`/api/conversations/${row.id}/deal`);
  assert.equal(result.status, 200);
  return result.body;
}
const list = async (f: Awaited<ReturnType<typeof fixture>>) => {
  const response = await f.client.get("/api/revenue/recovery");
  assert.equal(response.status, 200);
  return response.body;
};

test("the recovery list ranks stale open opportunities and hides escalated, closed and fresh ones", async () => {
  const f = await fixture();
  const stale = await lead(f, 20);
  const older = await lead(f, 30);
  const fresh = await lead(f, 0);
  const escalated = await lead(f, 25);
  const closed = await lead(f, 26);
  assert.equal(
    (
      await f
        .mutate("post", `/api/deals/${escalated.deal.id}/escalation`)
        .send({ enabled: true, reason: "Needs a clinic specialist" })
    ).status,
    200,
  );
  assert.equal(
    (
      await f
        .mutate("post", `/api/deals/${closed.deal.id}/outcome`)
        .send({ version: closed.deal.version, outcome: "won", reason: "fit" })
    ).status,
    200,
  );

  const report = await list(f);
  const ids = report.entries.map((entry: { dealId: string }) => entry.dealId);
  assert.deepEqual(ids, [older.deal.id, stale.deal.id]);
  assert.equal(
    report.entries.some(
      (entry: { dealId: string }) => entry.dealId === fresh.deal.id,
    ),
    false,
  );
  assert.equal(
    report.entries.some(
      (entry: { dealId: string }) => entry.dealId === escalated.deal.id,
    ),
    false,
  );
  assert.equal(
    report.entries.some(
      (entry: { dealId: string }) => entry.dealId === closed.deal.id,
    ),
    false,
  );
  const [first] = report.entries;
  assert.equal(first.dealId, older.deal.id);
  assert.equal(first.daysStale, 30);
  assert.equal(first.stage, "new");
  assert.equal(first.reason, "No customer response in seven days.");
  assert.ok(first.nextAction.length > 0);
  assert.equal(first.currency, "USD");
  assert.match(report.notice, /sent automatically/i);
});

test("a dismissed opportunity leaves the list and restore brings it back", async () => {
  const f = await fixture();
  const stale = await lead(f, 12);
  assert.equal(
    (await list(f)).entries.some(
      (entry: { dealId: string }) => entry.dealId === stale.deal.id,
    ),
    true,
  );
  const dismissed = await f
    .mutate("post", `/api/revenue/recovery/${stale.deal.id}/dismiss`)
    .send({ reason: "Waiting for the clinic to confirm a date." });
  assert.equal(dismissed.status, 200);
  const afterDismiss = await list(f);
  assert.equal(
    afterDismiss.entries.some(
      (entry: { dealId: string }) => entry.dealId === stale.deal.id,
    ),
    false,
  );
  assert.equal(
    afterDismiss.dismissed.some(
      (entry: { dealId: string }) => entry.dealId === stale.deal.id,
    ),
    true,
  );
  const restored = await f
    .mutate("post", `/api/revenue/recovery/${stale.deal.id}/restore`)
    .send({});
  assert.equal(restored.status, 200);
  const afterRestore = await list(f);
  assert.equal(
    afterRestore.entries.some(
      (entry: { dealId: string }) => entry.dealId === stale.deal.id,
    ),
    true,
  );
  assert.equal(
    afterRestore.dismissed.some(
      (entry: { dealId: string }) => entry.dealId === stale.deal.id,
    ),
    false,
  );
});

test("a dismissal reason is recorded in the audit trail", async () => {
  const f = await fixture();
  const stale = await lead(f, 15);
  const reason = "Waiting for the clinic to confirm a date.";
  assert.equal(
    (
      await f
        .mutate("post", `/api/revenue/recovery/${stale.deal.id}/dismiss`)
        .send({ reason })
    ).status,
    200,
  );
  const events = await f.database.query(
    "SELECT action,resource_id,detail FROM audit_events WHERE workspace_id=$1 AND resource_id=$2 AND action LIKE 'revenue.recovery_%' ORDER BY created_at,id",
    [f.snapshot.workspace.id, stale.deal.id],
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].action, "revenue.recovery_dismissed");
  assert.equal(events[0].detail.reason, reason);
  await f
    .mutate("post", `/api/revenue/recovery/${stale.deal.id}/restore`)
    .send({});
  const restored = await f.database.query(
    "SELECT action FROM audit_events WHERE workspace_id=$1 AND resource_id=$2 AND action='revenue.recovery_restored'",
    [f.snapshot.workspace.id, stale.deal.id],
  );
  assert.equal(restored.length, 1);
});

test("a dismissal reason must be a real sentence and another workspace is invisible", async () => {
  const f = await fixture();
  const other = await fixture();
  const mine = await lead(f, 18);
  const theirs = await lead(other, 18);
  assert.equal(
    (
      await f
        .mutate("post", `/api/revenue/recovery/${mine.deal.id}/dismiss`)
        .send({ reason: "no" })
    ).status,
    400,
  );
  assert.equal(
    (
      await f
        .mutate("post", `/api/revenue/recovery/${mine.deal.id}/dismiss`)
        .send({ reason: "x".repeat(301) })
    ).status,
    400,
  );
  const report = await list(f);
  assert.equal(
    report.entries.some(
      (entry: { dealId: string }) => entry.dealId === theirs.deal.id,
    ),
    false,
  );
  assert.equal(
    (
      await f
        .mutate("post", `/api/revenue/recovery/${theirs.deal.id}/dismiss`)
        .send({ reason: "Not my workspace." })
    ).status,
    404,
  );
  const theirsReport = await list(other);
  assert.equal(
    theirsReport.entries.some(
      (entry: { dealId: string }) => entry.dealId === theirs.deal.id,
    ),
    true,
  );
});

test("verified receipts keep their reference and refunds reverse the verified total", async () => {
  const f = await fixture();
  const data = await lead(f, 1);
  assert.equal(
    (
      await f
        .mutate("post", `/api/deals/${data.deal.id}/outcome`)
        .send({ version: data.deal.version, outcome: "won", reason: "fit" })
    ).status,
    200,
  );
  const payment = await f
    .mutate("post", `/api/deals/${data.deal.id}/revenue`)
    .set("Idempotency-Key", randomUUID())
    .send({
      kind: "payment",
      amountMinor: 8000,
      reference: "receipt-test-001",
      occurredAt: Date.now(),
      confirmed: true,
    });
  assert.equal(payment.status, 201);
  const refund = await f
    .mutate("post", `/api/deals/${data.deal.id}/revenue`)
    .set("Idempotency-Key", randomUUID())
    .send({
      kind: "refund",
      amountMinor: 3000,
      reference: "refund-test-001",
      occurredAt: Date.now(),
      confirmed: true,
    });
  assert.equal(refund.status, 201);

  const report = (await f.client.get("/api/revenue?currency=USD")).body;
  assert.equal(report.revenueMinor, 5000);
  assert.equal(report.reversedMinor, 3000);
  assert.equal(report.verifiedReceipts.length, 2);
  const receipt = report.verifiedReceipts.find(
    (row: { kind: string }) => row.kind === "payment",
  );
  const reversal = report.verifiedReceipts.find(
    (row: { kind: string }) => row.kind === "refund",
  );
  assert.equal(receipt.reference, "receipt-test-001");
  assert.equal(receipt.amountMinor, 8000);
  assert.equal(receipt.dealId, data.deal.id);
  assert.ok(receipt.name.length > 0);
  assert.equal(reversal.reference, "refund-test-001");
  assert.equal(reversal.amountMinor, 3000);
  const sum = report.verifiedReceipts.reduce(
    (total: number, row: { amountMinor: number; kind: string }) =>
      total + (row.kind === "refund" ? -1 : 1) * row.amountMinor,
    0,
  );
  assert.equal(sum, report.revenueMinor);
});
