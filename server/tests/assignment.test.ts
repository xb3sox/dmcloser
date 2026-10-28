import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import type { Config } from "../config.ts";
import { chooseAssignee, normalizeAssignment } from "../../src/domain/assignment.ts";

const config = {
  production: false,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  workerEnabled: false,
  graphVersion: "v26.0",
  prices: {},
  smtpPort: 587,
  mailFrom: "test@example.com",
  rateLimitMax: 10000,
  authRateLimitMax: 10000,
  recoveryRateLimitMax: 10000,
  trustProxy: 0,
} as Config;

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
const members = [
  { userId: "u2", load: 0 },
  { userId: "u1", load: 0 },
  { userId: "u3", load: 0 },
];

test("round-robin follows the fixed order and honours the cap", () => {
  const rule = normalizeAssignment({
    mode: "round_robin",
    cap: 1,
    eligibleUserIds: ["u1", "u2", "u3"],
    timezone: "UTC",
  });
  assert.equal(chooseAssignee(rule, members, null), "u1");
  assert.equal(chooseAssignee(rule, members, "u1"), "u2");
  assert.equal(
    chooseAssignee(
      rule,
      members.map((m) => (m.userId === "u2" ? { ...m, load: 1 } : m)),
      "u1",
    ),
    "u3",
  );
  assert.equal(
    chooseAssignee(rule, members.map((m) => ({ ...m, load: 1 })), "u1"),
    null,
  );
  assert.equal(chooseAssignee({ ...rule, eligibleUserIds: [] }, members), null);
  assert.equal(chooseAssignee({ ...rule, mode: "manual" }, members), null);
  assert.equal(normalizeAssignment({ mode: "bogus", cap: 0 }).mode, "manual");
  assert.equal(
    chooseAssignee(
      { ...rule, eligibleUserIds: ["u3"], mode: "load_capped" },
      members,
    ),
    "u3",
  );
});

test("load-capped picks the least loaded member below the cap", () => {
  const rule = normalizeAssignment({
    mode: "load_capped",
    cap: 2,
    eligibleUserIds: ["u1", "u2", "u3"],
    timezone: "UTC",
  });
  const loads = [
    { userId: "u1", load: 2 },
    { userId: "u2", load: 1 },
    { userId: "u3", load: 1 },
  ];
  assert.equal(chooseAssignee(rule, loads), "u2");
  assert.equal(chooseAssignee({ ...rule, cap: 1 }, loads), null);
  assert.equal(
    chooseAssignee({ ...rule, eligibleUserIds: ["u1"] }, loads),
    null,
  );
});

test("autoAssign is workspace-scoped, capped and audited", async () => {
  const { service } = await createApp(config, db);
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const ids = ["u1", "u2", "outsider"].map(() => randomUUID());
  for (const id of ids)
    await db.query(
      "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,'Member','hash')",
      [id, `${id}@example.com`],
    );
  const assignment = {
    mode: "load_capped",
    cap: 1,
    eligibleUserIds: [ids[0], ids[1]],
    timezone: "UTC",
  };
  await db.query(
    "INSERT INTO workspaces(id,owner_id,settings,trial_until) VALUES($1,$2,$3,$4),($5,$6,$7,$4)",
    [
      workspaceId,
      ids[0],
      JSON.stringify({ assignment }),
      Date.now() + 86400000,
      otherWorkspaceId,
      ids[2],
      JSON.stringify({}),
    ],
  );
  for (const userId of [ids[0], ids[1]])
    await db.query(
      "INSERT INTO members(workspace_id,user_id,role) VALUES($1,$2,'member')",
      [workspaceId, userId],
    );
  await db.query(
    "INSERT INTO members(workspace_id,user_id,role) VALUES($1,$2,'owner')",
    [otherWorkspaceId, ids[2]],
  );
  const conversations = ["c1", "c2", "c3"].map(() => randomUUID());
  for (const id of conversations)
    await db.query(
      "INSERT INTO conversations(id,workspace_id,platform,external_id,name,last_at,window_until) VALUES($1,$2,'whatsapp',$3,'Lead',$4,$4)",
      [id, workspaceId, randomUUID(), Date.now()],
    );

  const [first, second] = [ids[0], ids[1]].sort((a, b) => a.localeCompare(b));
  assert.equal(await service.autoAssign(db, workspaceId, conversations[0]), first);
  assert.equal(await service.autoAssign(db, workspaceId, conversations[1]), second);
  assert.equal(await service.autoAssign(db, workspaceId, conversations[2]), null);
  const otherConversation = randomUUID();
  await db.query(
    "INSERT INTO conversations(id,workspace_id,platform,external_id,name,last_at,window_until) VALUES($1,$2,'whatsapp',$3,'Other',$4,$4)",
    [otherConversation, otherWorkspaceId, randomUUID(), Date.now()],
  );
  assert.equal(await service.autoAssign(db, otherWorkspaceId, otherConversation), null);
  const loads = await db.query(
    "SELECT count(*)::integer AS n FROM conversations WHERE workspace_id=$1 AND assignee_user_id IS NOT NULL GROUP BY assignee_user_id",
    [workspaceId],
  );
  assert.ok(loads.every((row) => row.n <= 1));
  const [assigned, audited] = await db.query(
    "SELECT count(*)::integer AS n FROM conversations WHERE workspace_id=$1 AND assignee_user_id IS NOT NULL",
    [workspaceId],
  );
  assert.equal(assigned.n, 2);
  const audits = await db.query(
    "SELECT detail FROM audit_events WHERE workspace_id=$1 AND action='conversation.auto_assigned'",
    [workspaceId],
  );
  assert.equal(audits.length, 2);
});
