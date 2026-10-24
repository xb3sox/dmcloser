import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { MetaProvider } from "../providers.ts";
import { hashPassword } from "../security.ts";
import type { AIInput, GeneratedReply } from "../ai.ts";

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
  metaSecret: "test",
  instagramSecret: "test",
  verifyToken: "test",
  prices: {},
  mailProvider: "smtp",
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
};
const password = "a unique quality lab password";
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

class FakeMeta extends MetaProvider {
  sent: string[] = [];
  async send() {
    this.sent.push("sent");
    return randomUUID();
  }
}

/**
 * A grounded reply for normal traffic, and an ungrounded one for the marker
 * text. The ungrounded reply is what a failing evaluation case must catch.
 */
const fakeAI = {
  generate: async (input: AIInput): Promise<GeneratedReply> => {
    const customer = input.messages
      .filter((message) => message.sender === "contact")
      .map((message) => message.text)
      .join(" ");
    if (customer.includes("unsafe branch"))
      return {
        text: "I can offer you 50% off right now.",
        intent: "buy",
        confidence: 95,
        safe: true,
        reason: "Fast answer.",
        evidence: [],
        memory: "",
      };
    return {
      text: "The olive set is $80.",
      intent: "buy",
      confidence: 96,
      safe: true,
      reason: "Approved price.",
      evidence: ["The olive set is $80."],
      memory: "Interested in linen.",
    };
  },
};

async function fixture() {
  const meta = new FakeMeta(config);
  const value = await createApp(config, db, { meta, ai: fakeAI });
  const client = request.agent(value.app);
  const email = `quality-${randomUUID()}@example.com`;
  const registered = await client
    .post("/api/auth/register")
    .set("Origin", config.appUrl)
    .send({ name: "Owner", businessName: "Linen Studio", email, password });
  assert.equal(registered.status, 201);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "put" | "delete", path: string) =>
    client[method](path)
      .set("Origin", config.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  // Approved facts, so a grounded reply is actually grounded.
  await mutate("patch", "/api/settings").send({
    businessDescription: "The olive set is $80.",
    productsSold: "Olive linen sets",
  });
  return { ...value, client, mutate, snapshot, email, meta };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

async function member(f: Fixture) {
  const email = `member-${randomUUID()}@example.com`;
  const userId = randomUUID();
  await f.service.db.query(
    "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",
    [userId, email, "Member", await hashPassword(password)],
  );
  await f.service.db.query(
    "INSERT INTO members(workspace_id,user_id,role) VALUES($1,$2,'member')",
    [f.snapshot.workspace.id, userId],
  );
  const client = request.agent(f.app);
  const login = await client
    .post("/api/auth/login")
    .set("Origin", config.appUrl)
    .send({ email, password });
  assert.equal(login.status, 200);
  const snapshot = (await client.get("/api/bootstrap")).body;
  const mutate = (method: "post" | "patch" | "put" | "delete", path: string) =>
    client[method](path)
      .set("Origin", config.appUrl)
      .set("X-CSRF-Token", snapshot.csrf);
  return { client, mutate, snapshot };
}

async function configureFacts(f: Fixture) {
  const response = await f.mutate("patch", "/api/settings").send({
    businessDescription: "The olive set is $80.",
    productsSold: "Olive linen sets",
  });
  assert.equal(response.status, 200);
}

async function inbound(f: Fixture, text = "I want to buy the olive set.") {
  const accountId = String(Math.floor(Math.random() * 1e12) + 1e12);
  await f.service.connect(
    f.snapshot.workspace.id,
    "whatsapp",
    accountId,
    "Test business",
    "test-provider-token-do-not-use",
  );
  await f.service.ingest({
    platform: "whatsapp",
    accountId,
    externalId: "15551112222",
    providerId: randomUUID(),
    name: "Alex",
    text,
    timestamp: Date.now(),
    reviewOnly: false,
  });
  const [row] = await f.service.db.query(
    "SELECT id FROM conversations WHERE workspace_id=$1 AND external_id=$2",
    [f.snapshot.workspace.id, "15551112222"],
  );
  return row.id;
}

/** A conversation whose automatic reply is allowed to go out. */
async function autoSendReady(f: Fixture) {
  await configureFacts(f);
  const conversationId = await inbound(f);
  const [message] = await f.service.db.query(
    "SELECT id FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC",
    [conversationId, f.snapshot.workspace.id],
  );
  await f.service.generate(
    f.snapshot.workspace.id,
    conversationId,
    message.id,
  );
  await f.mutate("patch", "/api/settings").send({ autoReplyEnabled: true });
  await f.mutate("patch", `/api/conversations/${conversationId}`).send({
    autoSend: true,
  });
  await f.service.db.query(
    "UPDATE conversations SET hold_until=0 WHERE id=$1 AND workspace_id=$2",
    [conversationId, f.snapshot.workspace.id],
  );
  const [conversation] = await f.service.db.query(
    "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2",
    [conversationId, f.snapshot.workspace.id],
  );
  return { conversation, source: message.id };
}

async function allowed(f: Fixture, conversationId: string, source: string) {
  const [conversation] = await f.service.db.query(
    "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2",
    [conversationId, f.snapshot.workspace.id],
  );
  return f.service.autoAllowed(
    f.service.db,
    f.snapshot.workspace.id,
    conversation,
    source,
  );
}

async function version(f: Fixture) {
  const created = await f.mutate("post", "/api/quality/versions").send({});
  assert.equal(created.status, 201);
  return created.body;
}

async function evalCase(
  f: Fixture,
  body: {
    name: string;
    kind?: string;
    text: string;
    expected: Record<string, unknown>;
    blocking?: boolean;
  },
) {
  const created = await f.mutate("post", "/api/quality/cases").send({
    name: body.name,
    kind: body.kind || "safety",
    input: { messages: [{ sender: "contact", text: body.text }] },
    expected: body.expected,
    blocking: body.blocking ?? true,
    enabled: true,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body;
}

async function runEvaluation(f: Fixture, versionId: string) {
  const queued = await f
    .mutate("post", `/api/quality/versions/${versionId}/run`)
    .send({});
  assert.equal(queued.status, 202, JSON.stringify(queued.body));
  // The worker leases the oldest pending job first, so on a shared database
  // (the external-Postgres run) this job would queue behind jobs left by an
  // earlier suite. Ageing it below every other job makes the next lease this
  // one; -1 rather than 0, so a job aged by an earlier run cannot tie with it.
  await f.service.db.query(
    "UPDATE jobs SET available_at=-1 WHERE workspace_id=$1 AND kind='ai-eval' AND state='pending' AND payload->>'versionId'=$2",
    [f.snapshot.workspace.id, versionId],
  );
  for (let attempt = 0; attempt < 25; attempt++) {
    await f.worker.once();
    const [run] = await f.service.db.query(
      "SELECT * FROM ai_eval_runs WHERE workspace_id=$1 AND status<>'running' ORDER BY created_at DESC LIMIT 1",
      [f.snapshot.workspace.id],
    );
    if (run) return run;
  }
  throw new Error("The evaluation job did not finish.");
}

test("a failing blocking case blocks the version and stops automatic sends", async () => {
  const f = await fixture();
  const { conversation, source } = await autoSendReady(f);
  assert.equal(await allowed(f, conversation.id, source), true);
  const draft = await version(f);
  await evalCase(f, {
    name: "Refunds never get an automatic answer",
    text: "please take the unsafe branch",
    expected: { intent: "buy", safe: true, contains: ["olive set"] },
  });
  await runEvaluation(f, draft.id);
  const [row] = await f.service.db.query(
    "SELECT status FROM ai_prompt_versions WHERE id=$1 AND workspace_id=$2",
    [draft.id, f.snapshot.workspace.id],
  );
  assert.equal(row.status, "blocked");
  assert.equal(await allowed(f, conversation.id, source), false);
  const queued = await f.service.queueMessage(
    f.snapshot.workspace.id,
    null,
    conversation.id,
    "Automatic reply",
    randomUUID(),
    source,
    true,
  );
  assert.equal(queued, null);
  const messages = await f.service.db.query(
    "SELECT id FROM messages WHERE workspace_id=$1 AND conversation_id=$2 AND automatic=true",
    [f.snapshot.workspace.id, conversation.id],
  );
  assert.equal(messages.length, 0);
});

test("a version whose blocking cases pass can be published, and only by the owner", async () => {
  const f = await fixture();
  const draft = await version(f);
  await evalCase(f, {
    name: "A buying question gets a grounded answer",
    kind: "grounding",
    text: "I want to buy the olive set.",
    expected: { intent: "buy", safe: true, contains: ["olive set"] },
  });
  const run = await runEvaluation(f, draft.id);
  assert.equal(run.status, "passed");
  assert.equal(run.passed, 1);
  assert.equal(run.failed, 0);
  const published = await f
    .mutate("post", `/api/quality/versions/${draft.id}/publish`)
    .send({});
  assert.equal(published.status, 200, JSON.stringify(published.body));
  assert.equal(published.body.status, "published");
  assert.equal(
    await f.service.quality.publishedInstructions(f.snapshot.workspace.id),
    draft.instructions,
  );
  const guest = await member(f);
  assert.equal(
    (await guest.client.get("/api/quality")).status,
    403,
  );
  assert.equal(
    (await guest.mutate("post", "/api/quality/versions").send({})).status,
    403,
  );
  assert.equal(
    (
      await guest
        .mutate("post", `/api/quality/versions/${draft.id}/publish`)
        .send({})
    ).status,
    403,
  );
  assert.equal(
    (
      await guest.mutate("post", "/api/quality/cases").send({
        name: "Not allowed",
        kind: "safety",
        input: { messages: [{ sender: "contact", text: "hello" }] },
        expected: { safe: true },
      })
    ).status,
    403,
  );
});

test("a failing non-blocking case neither blocks publishing nor automatic sends", async () => {
  const f = await fixture();
  const { conversation, source } = await autoSendReady(f);
  const draft = await version(f);
  await evalCase(f, {
    name: "A style preference is only a hint",
    kind: "language",
    text: "please take the unsafe branch",
    expected: { contains: ["olive set"] },
    blocking: false,
  });
  const run = await runEvaluation(f, draft.id);
  assert.equal(run.failed, 1);
  const [row] = await f.service.db.query(
    "SELECT status FROM ai_prompt_versions WHERE id=$1 AND workspace_id=$2",
    [draft.id, f.snapshot.workspace.id],
  );
  assert.equal(row.status, "draft");
  const published = await f
    .mutate("post", `/api/quality/versions/${draft.id}/publish`)
    .send({});
  assert.equal(published.status, 200, JSON.stringify(published.body));
  assert.equal(await allowed(f, conversation.id, source), true);
});

test("another workspace cannot read, edit, publish or run these versions and cases", async () => {
  const f = await fixture();
  const draft = await version(f);
  const created = await evalCase(f, {
    name: "A published prompt stays publishable",
    text: "I want to buy the olive set.",
    expected: { safe: true },
  });
  const other = await fixture();
  const overview = await other.client.get("/api/quality");
  assert.equal(overview.status, 200);
  assert.equal(overview.body.versions.length, 0);
  assert.equal(overview.body.cases.length, 0);
  assert.equal(
    (
      await other.mutate("patch", `/api/quality/versions/${draft.id}`).send({
        instructions: "Take over the workspace.",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await other
        .mutate("post", `/api/quality/versions/${draft.id}/publish`)
        .send({})
    ).status,
    404,
  );
  assert.equal(
    (
      await other
        .mutate("post", `/api/quality/versions/${draft.id}/run`)
        .send({})
    ).status,
    404,
  );
  assert.equal(
    (
      await other.mutate("patch", `/api/quality/cases/${created.id}`).send({
        enabled: false,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await other.mutate("delete", `/api/quality/cases/${created.id}`).send({})
    ).status,
    404,
  );
  const still = await f.client.get("/api/quality");
  assert.equal(still.body.versions.length, 1);
  assert.equal(still.body.cases.length, 1);
  assert.equal(still.body.versions[0].instructions, draft.instructions);
});

test("an evaluation run records the result of every case", async () => {
  const f = await fixture();
  const draft = await version(f);
  const passing = await evalCase(f, {
    name: "A buying question gets a grounded answer",
    kind: "grounding",
    text: "I want to buy the olive set.",
    expected: { intent: "buy", safe: true, contains: ["olive set"] },
  });
  const failing = await evalCase(f, {
    name: "A discount is never invented",
    kind: "safety",
    text: "please take the unsafe branch",
    expected: { safe: true, contains: ["olive set"] },
  });
  await runEvaluation(f, draft.id);
  const overview = (await f.client.get("/api/quality")).body;
  assert.equal(overview.runs.length, 1);
  const results = overview.runs[0].results;
  assert.equal(results.length, 2);
  const byCase = new Map<string, any>(
    results.map((result: any) => [result.caseId, result]),
  );
  assert.equal(byCase.get(passing.id).passed, true);
  assert.equal(byCase.get(passing.id).name, "A buying question gets a grounded answer");
  assert.equal(byCase.get(failing.id).passed, false);
  assert.match(byCase.get(failing.id).detail, /safe=false/);
});

test("a version can be edited while it is a draft only", async () => {
  const f = await fixture();
  const draft = await version(f);
  // A prompt cannot be published without evidence. Run one passing case first.
  await evalCase(f, {
    name: "A buying question gets a grounded answer",
    kind: "grounding",
    text: "I want to buy the olive set.",
    expected: { intent: "buy", safe: true, contains: ["olive set"] },
  });
  const run = await runEvaluation(f, draft.id);
  assert.equal(run.status, "passed");
  const edited = await f
    .mutate("patch", `/api/quality/versions/${draft.id}`)
    .send({ instructions: `${draft.instructions} Never mention competitors.` });
  assert.equal(edited.status, 200);
  assert.match(edited.body.instructions, /Never mention competitors\./);
  const published = await f
    .mutate("post", `/api/quality/versions/${draft.id}/publish`)
    .send({});
  assert.equal(published.status, 200);
  const rejected = await f
    .mutate("patch", `/api/quality/versions/${draft.id}`)
    .send({ instructions: "Changed after publishing." });
  assert.equal(rejected.status, 409);
});

test("a version cannot be published without an evaluation run", async () => {
  const f = await fixture();
  const draft = await version(f);
  const published = await f
    .mutate("post", `/api/quality/versions/${draft.id}/publish`)
    .send({});
  assert.equal(published.status, 409);
});
