import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "./db.ts";
import { HttpError } from "./security.ts";
import { defaultInstructions, guardReply, type AIInput } from "./ai.ts";
import { emptySettings, type Actor, type ProductService } from "./service.ts";
import type { BusinessSettings } from "../src/types/index.ts";

export type PromptStatus = "draft" | "published" | "blocked" | "archived";
export type RunStatus = "running" | "passed" | "failed";

export interface PromptVersion {
  id: string;
  version: number;
  instructions: string;
  status: PromptStatus;
  notes: string;
  actorId: string | null;
  createdAt: string;
  publishedAt: string | null;
}
export interface EvalResult {
  caseId: string;
  name: string;
  passed: boolean;
  detail: string;
}
export interface EvalRun {
  id: string;
  versionId: string;
  status: RunStatus;
  passed: number;
  failed: number;
  results: EvalResult[];
  createdAt: string;
  finishedAt: string | null;
}
export interface EvalCase {
  id: string;
  name: string;
  kind: string;
  input: unknown;
  expected: unknown;
  blocking: boolean;
  enabled: boolean;
  createdAt: string;
}

const settingsSchema = z
  .object({
    businessName: z.string().trim().min(1).max(100),
    businessDescription: z.string().trim().min(1).max(2000),
    productsSold: z.string().trim().min(1).max(1000),
    tone: z.enum(["friendly", "premium", "aggressive"]),
    autoReplyEnabled: z.boolean(),
    autoSendConfidenceThreshold: z.number().int().min(50).max(100),
  })
  .strict();
/** Customer-shaped case input. It is data, never an instruction. */
export const evalInputSchema = z
  .object({
    settings: settingsSchema.optional(),
    messages: z
      .array(
        z
          .object({
            sender: z.enum(["contact", "ai", "user"]),
            text: z.string().max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export const evalExpectationSchema = z
  .object({
    intent: z.enum(["buy", "question", "spam"]).optional(),
    safe: z.boolean().optional(),
    contains: z.array(z.string().max(200)).max(20).optional(),
  })
  .strict();
export const caseBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    kind: z.string().trim().min(1).max(40),
    input: evalInputSchema,
    expected: evalExpectationSchema,
    blocking: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();
export const casePatchSchema = caseBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Nothing to change.");

const versionView = (row: any): PromptVersion => ({
  id: row.id,
  version: Number(row.version),
  instructions: String(row.instructions),
  status: row.status as PromptStatus,
  notes: String(row.notes || ""),
  actorId: row.actor_id === null ? null : String(row.actor_id),
  createdAt: new Date(row.created_at).toISOString(),
  publishedAt:
    row.published_at === null || row.published_at === undefined
      ? null
      : new Date(row.published_at).toISOString(),
});
const caseView = (row: any): EvalCase => ({
  id: row.id,
  name: String(row.name),
  kind: String(row.kind),
  input: row.input,
  expected: row.expected,
  blocking: row.blocking === true,
  enabled: row.enabled === true,
  createdAt: new Date(row.created_at).toISOString(),
});
const runView = (row: any): EvalRun => ({
  id: row.id,
  versionId: String(row.version_id),
  status: row.status as RunStatus,
  passed: Number(row.passed),
  failed: Number(row.failed),
  results: Array.isArray(row.results) ? (row.results as EvalResult[]) : [],
  createdAt: new Date(row.created_at).toISOString(),
  finishedAt:
    row.finished_at === null || row.finished_at === undefined
      ? null
      : new Date(row.finished_at).toISOString(),
});

/**
 * The AI Quality Lab. It records prompt versions, evaluation cases and their
 * runs, and it can only ever *block* automation: nothing here sends a
 * message, and a blocked version stops automatic sends for the workspace.
 */
export class QualityService {
  constructor(private service: ProductService) {}

  private get db() {
    return this.service.db;
  }

  private assertOwner(actor: Actor) {
    if (actor.role !== "owner")
      throw new HttpError(403, "Only the workspace owner can do this.");
  }

  async overview(workspaceId: string) {
    const [versions, cases, runs] = await Promise.all([
      this.db.query(
        "SELECT * FROM ai_prompt_versions WHERE workspace_id=$1 ORDER BY version DESC",
        [workspaceId],
      ),
      this.db.query(
        "SELECT * FROM ai_eval_cases WHERE workspace_id=$1 ORDER BY created_at,id",
        [workspaceId],
      ),
      this.db.query(
        "SELECT * FROM ai_eval_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 25",
        [workspaceId],
      ),
    ]);
    return {
      versions: versions.map(versionView),
      cases: cases.map(caseView),
      runs: runs.map(runView),
    };
  }

  /** The published prompt for a workspace, or undefined for the built-in default. */
  async publishedInstructions(workspaceId: string) {
    const [row] = await this.db.query(
      "SELECT instructions FROM ai_prompt_versions WHERE workspace_id=$1 AND status='published' ORDER BY version DESC LIMIT 1",
      [workspaceId],
    );
    return row ? (String(row.instructions) as string) : undefined;
  }

  /** True when a version failed a blocking case. Automation stops for the workspace. */
  async isBlocked(workspaceId: string, db: Database = this.service.db) {
    const rows = await db.query(
      "SELECT id FROM ai_prompt_versions WHERE workspace_id=$1 AND status='blocked' LIMIT 1",
      [workspaceId],
    );
    return rows.length > 0;
  }

  private async version(id: string, workspaceId: string) {
    const [row] = await this.db.query(
      "SELECT * FROM ai_prompt_versions WHERE id=$1 AND workspace_id=$2",
      [id, workspaceId],
    );
    if (!row) throw new HttpError(404, "Prompt version not found.");
    return versionView(row);
  }

  private async case(id: string, workspaceId: string) {
    const [row] = await this.db.query(
      "SELECT * FROM ai_eval_cases WHERE id=$1 AND workspace_id=$2",
      [id, workspaceId],
    );
    if (!row) throw new HttpError(404, "Evaluation case not found.");
    return caseView(row);
  }

  private async seedInstructions(workspaceId: string) {
    const published = await this.publishedInstructions(workspaceId);
    if (published) return published;
    const [workspace] = await this.db.query(
      "SELECT settings FROM workspaces WHERE id=$1",
      [workspaceId],
    );
    const brain = await this.service.revenue.context(workspaceId);
    return defaultInstructions({
      settings: {
        ...emptySettings,
        ...((workspace?.settings || {}) as Partial<BusinessSettings>),
      },
      industryBoundary: brain.boundary,
    });
  }

  async createVersion(actor: Actor, instructions?: string) {
    this.assertOwner(actor);
    const workspaceId = actor.workspaceId;
    const text =
      typeof instructions === "string" && instructions.trim().length > 0
        ? instructions
        : await this.seedInstructions(workspaceId);
    const id = randomUUID();
    let version = 0;
    await this.db.transaction(async (tx) => {
      // Serialize version allocation: otherwise two drafts could read the same
      // max version and either violate UNIQUE(workspace_id, version) or
      // overwrite each other.
      await tx.query("LOCK TABLE ai_prompt_versions IN EXCLUSIVE MODE");
      const [row] = await tx.query(
        "SELECT max(version)::integer AS version FROM ai_prompt_versions WHERE workspace_id=$1",
        [workspaceId],
      );
      version = Number(row?.version ?? 0) + 1;
      await tx.query(
        "INSERT INTO ai_prompt_versions(id,workspace_id,version,instructions,status,actor_id) VALUES($1,$2,$3,$4,'draft',$5)",
        [id, workspaceId, version, text, actor.userId],
      );
    });
    await this.service.audit(
      workspaceId,
      actor.userId,
      "quality.version_created",
      id,
      { version },
    );
    this.service.changed(workspaceId);
    return this.version(id, workspaceId);
  }

  async updateVersion(actor: Actor, id: string, instructions: string) {
    this.assertOwner(actor);
    const version = await this.version(id, actor.workspaceId);
    if (version.status !== "draft")
      throw new HttpError(
        409,
        "Only a draft version can be edited. Create a new draft instead.",
      );
    await this.db.query(
      "UPDATE ai_prompt_versions SET instructions=$1 WHERE id=$2 AND workspace_id=$3",
      [instructions, id, actor.workspaceId],
    );
    await this.service.audit(
      actor.workspaceId,
      actor.userId,
      "quality.version_updated",
      id,
      { version: version.version },
    );
    this.service.changed(actor.workspaceId);
    return this.version(id, actor.workspaceId);
  }

  /** Names of the blocking cases that failed on the version's last run. */
  private async failedBlockingCases(workspaceId: string, versionId: string) {
    const [run] = await this.db.query(
      "SELECT results FROM ai_eval_runs WHERE workspace_id=$1 AND version_id=$2 ORDER BY created_at DESC LIMIT 1",
      [workspaceId, versionId],
    );
    if (!run) return [];
    const results: EvalResult[] = Array.isArray(run.results)
      ? (run.results as EvalResult[])
      : [];
    const failed = results.filter((result) => result && result.passed === false);
    if (!failed.length) return [];
    const cases = await this.db.query(
      "SELECT id,name,blocking FROM ai_eval_cases WHERE workspace_id=$1",
      [workspaceId],
    );
    const blocking = new Set(
      cases.filter((row: any) => row.blocking).map((row: any) => String(row.id)),
    );
    return failed
      .filter((result) => blocking.has(String(result.caseId)))
      .map((result) => result.name);
  }

  async publishVersion(actor: Actor, id: string) {
    this.assertOwner(actor);
    const version = await this.version(id, actor.workspaceId);
    if (version.status === "blocked")
      throw new HttpError(
        409,
        "This version is blocked because a blocking evaluation case failed. Fix the case or the prompt, then run the evaluation again.",
      );
    if (version.status === "published") return version;
    if (version.status !== "draft")
      throw new HttpError(409, "Only a draft version can be published.");
    const [latestRun] = await this.db.query(
      "SELECT status FROM ai_eval_runs WHERE workspace_id=$1 AND version_id=$2 ORDER BY created_at DESC LIMIT 1",
      [actor.workspaceId, id],
    );
    if (!latestRun)
      throw new HttpError(
        409,
        "This version has never been evaluated. Run the evaluation before publishing.",
      );
    if (latestRun.status !== "passed")
      throw new HttpError(
        409,
        "The latest evaluation did not pass. Fix the findings, run it again, then publish.",
      );
    const failed = await this.failedBlockingCases(actor.workspaceId, id);
    if (failed.length)
      throw new HttpError(
        409,
        `A blocking evaluation case failed (${failed.join(", ")}). Fix it before publishing this version.`,
      );
    await this.db.transaction(async (tx) => {
      await tx.query(
        "UPDATE ai_prompt_versions SET status='archived' WHERE workspace_id=$1 AND status='published' AND id<>$2",
        [actor.workspaceId, id],
      );
      await tx.query(
        "UPDATE ai_prompt_versions SET status='published',published_at=now() WHERE id=$1 AND workspace_id=$2",
        [id, actor.workspaceId],
      );
    });
    await this.service.audit(
      actor.workspaceId,
      actor.userId,
      "quality.version_published",
      id,
      { version: version.version },
    );
    this.service.changed(actor.workspaceId);
    return this.version(id, actor.workspaceId);
  }

  async enqueueRun(actor: Actor, id: string) {
    this.assertOwner(actor);
    await this.version(id, actor.workspaceId);
    await this.service.enqueue(
      "ai-eval",
      { versionId: id },
      actor.workspaceId,
      randomUUID(),
    );
    await this.service.audit(
      actor.workspaceId,
      actor.userId,
      "quality.eval_requested",
      id,
      {},
    );
    this.service.changed(actor.workspaceId);
    return { ok: true, queued: true };
  }

  /**
   * Run the enabled evaluation cases against a version. Called by the durable
   * queue, never from the request path: evaluations call the model.
   */
  async runVersion(workspaceId: string, versionId: string) {
    const version = await this.version(versionId, workspaceId);
    const [workspace] = await this.db.query(
      "SELECT settings FROM workspaces WHERE id=$1",
      [workspaceId],
    );
    const brain = await this.service.revenue.context(workspaceId);
    const settings: BusinessSettings = {
      ...emptySettings,
      ...((workspace?.settings || {}) as Partial<BusinessSettings>),
    };
    const cases = await this.db.query(
      "SELECT * FROM ai_eval_cases WHERE workspace_id=$1 AND enabled=true ORDER BY created_at,id",
      [workspaceId],
    );
    const runId = randomUUID();
    await this.db.query(
      "INSERT INTO ai_eval_runs(id,workspace_id,version_id,status,passed,failed,results) VALUES($1,$2,$3,'running',0,0,'[]'::jsonb)",
      [runId, workspaceId, versionId],
    );
    const results: EvalResult[] = [];
    for (const row of cases)
      results.push(
        await this.runCase(workspaceId, version, settings, brain, row),
      );
    const passed = results.filter((result) => result.passed).length;
    const failed = results.length - passed;
    const blockingIds = new Set(
      cases
        .filter((row: any) => row.blocking)
        .map((row: any) => String(row.id)),
    );
    const blocked = results.some(
      (result) => !result.passed && blockingIds.has(result.caseId),
    );
    // If the version is currently blocked, record which blocking case ids were
    // failing in that run. A later passing run only unblocks the version if
    // those same failures are genuinely covered (i.e. the failing case was not
    // deleted to shop past the gate).
    let priorBlockedCaseIds: Set<string> = new Set();
    if (version.status === "blocked") {
      const [priorRun] = await this.db.query(
        "SELECT results FROM ai_eval_runs WHERE workspace_id=$1 AND version_id=$2 AND status='failed' ORDER BY created_at DESC LIMIT 1",
        [workspaceId, versionId],
      );
      const priorResults = Array.isArray(priorRun?.results) ? priorRun.results : [];
      for (const entry of priorResults) priorBlockedCaseIds.add(String(entry.caseId));
    }
    const coversPriorBlockedCases =
      priorBlockedCaseIds.size === 0 ||
      [...priorBlockedCaseIds].every((caseId) => blockingIds.has(caseId));
    // A run with no enabled cases (or one that threw before running a case)
    // leaves no evidence, so it cannot be "passed" — and it never unblocks a
    // version. This also keeps the publish gate from accepting an empty run.
    const runStatus =
      cases.length === 0 ? "failed" : blocked ? "failed" : "passed";
    await this.db.query(
      "UPDATE ai_eval_runs SET status=$1,passed=$2,failed=$3,results=$4,finished_at=now() WHERE id=$5 AND workspace_id=$6",
      [
        runStatus,
        passed,
        failed,
        JSON.stringify(results),
        runId,
        workspaceId,
      ],
    );
    if (blocked)
      await this.db.query(
        "UPDATE ai_prompt_versions SET status='blocked',notes=CASE WHEN notes='' THEN $3 ELSE notes END WHERE id=$1 AND workspace_id=$2 AND status<>'archived'",
        [
          versionId,
          workspaceId,
          "A blocking evaluation case failed. Fix it and run the evaluation again.",
        ],
      );
    else if (
      cases.length > 0 &&
      blockingIds.size > 0 &&
      coversPriorBlockedCases
    ) {
      await this.db.query(
        "UPDATE ai_prompt_versions SET status='draft' WHERE id=$1 AND workspace_id=$2 AND status='blocked'",
        [versionId, workspaceId],
      );
    }
    await this.service.audit(
      workspaceId,
      null,
      "quality.eval_run",
      versionId,
      { runId, passed, failed, blocked },
    );
    this.service.changed(workspaceId);
    return { runId, passed, failed, blocked };
  }

  private async runCase(
    workspaceId: string,
    version: PromptVersion,
    settings: BusinessSettings,
    brain: { facts: string; boundary: string; profile: { industry: string } },
    row: any,
  ): Promise<EvalResult> {
    const name = String(row.name);
    try {
      const parsed = evalInputSchema.parse(row.input);
      const expectation = evalExpectationSchema.parse(row.expected);
      const input: AIInput = {
        settings: parsed.settings || settings,
        notes: "",
        memory: "",
        messages: parsed.messages.map((message) => ({
          sender: message.sender,
          text: message.text,
        })),
        businessFacts: brain.facts,
        industry: brain.profile.industry,
        industryBoundary: brain.boundary,
        salesContext: "",
        instructions: version.instructions,
      };
      const reply = guardReply(await this.service.ai.generate(input), input);
      const problems: string[] = [];
      if (expectation.intent && reply.intent !== expectation.intent)
        problems.push(
          `expected intent "${expectation.intent}", got "${reply.intent}"`,
        );
      if (expectation.safe !== undefined && reply.safe !== expectation.safe)
        problems.push(
          `expected safe=${expectation.safe}, got safe=${reply.safe}`,
        );
      for (const needle of expectation.contains || [])
        if (!reply.text.toLowerCase().includes(needle.toLowerCase()))
          problems.push(`reply does not contain "${needle}"`);
      return {
        caseId: String(row.id),
        name,
        passed: problems.length === 0,
        detail: problems.length ? problems.join("; ") : "Passed.",
      };
    } catch (error) {
      return {
        caseId: String(row.id),
        name,
        passed: false,
        detail:
          error instanceof Error
            ? error.message.slice(0, 300)
            : "The case could not be run.",
      };
    }
  }

  async createCase(actor: Actor, body: unknown) {
    this.assertOwner(actor);
    const parsed = caseBodySchema.parse(body);
    const id = randomUUID();
    await this.db.query(
      "INSERT INTO ai_eval_cases(id,workspace_id,name,kind,input,expected,blocking,enabled) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        actor.workspaceId,
        parsed.name,
        parsed.kind,
        JSON.stringify(parsed.input),
        JSON.stringify(parsed.expected),
        parsed.blocking ?? true,
        parsed.enabled ?? true,
      ],
    );
    await this.service.audit(
      actor.workspaceId,
      actor.userId,
      "quality.case_created",
      id,
      { name: parsed.name },
    );
    this.service.changed(actor.workspaceId);
    return this.case(id, actor.workspaceId);
  }

  async updateCase(actor: Actor, id: string, body: unknown) {
    this.assertOwner(actor);
    const parsed = casePatchSchema.parse(body);
    const existing = await this.case(id, actor.workspaceId);
    await this.db.query(
      "UPDATE ai_eval_cases SET name=$1,kind=$2,input=$3,expected=$4,blocking=$5,enabled=$6 WHERE id=$7 AND workspace_id=$8",
      [
        parsed.name ?? existing.name,
        parsed.kind ?? existing.kind,
        JSON.stringify(parsed.input ?? existing.input),
        JSON.stringify(parsed.expected ?? existing.expected),
        parsed.blocking ?? existing.blocking,
        parsed.enabled ?? existing.enabled,
        id,
        actor.workspaceId,
      ],
    );
    await this.service.audit(
      actor.workspaceId,
      actor.userId,
      "quality.case_updated",
      id,
      { name: parsed.name ?? existing.name },
    );
    this.service.changed(actor.workspaceId);
    return this.case(id, actor.workspaceId);
  }

  async deleteCase(actor: Actor, id: string) {
    this.assertOwner(actor);
    const rows = await this.db.query(
      "DELETE FROM ai_eval_cases WHERE id=$1 AND workspace_id=$2 RETURNING id",
      [id, actor.workspaceId],
    );
    if (!rows.length) throw new HttpError(404, "Evaluation case not found.");
    await this.service.audit(
      actor.workspaceId,
      actor.userId,
      "quality.case_deleted",
      id,
      {},
    );
    this.service.changed(actor.workspaceId);
    return { ok: true };
  }
}
