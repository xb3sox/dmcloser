import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Database } from "./db.ts";
import type { Config } from "./config.ts";
import { decrypt, digest, encrypt, encryptBuffer, HttpError } from "./security.ts";
import { detectRisk, guardReply, type AIEngine, type AIInput } from "./ai.ts";
import { isClinical, isOptOut } from "../src/domain/safety.ts";
import {
  MetaProvider,
  ProviderError,
  type IncomingMessage,
  type DeliveryUpdate,
} from "./providers.ts";
import type { BusinessSettings } from "../src/types/index.ts";
import { RevenueService } from "./revenue.ts";
import { QualityService } from "./quality.ts";

export interface Actor {
  userId: string;
  workspaceId: string;
  role: "owner" | "member";
  email: string;
  name: string;
  csrf: string;
  sessionHash: string;
  verified: boolean;
}
export const emptySettings: BusinessSettings = {
  businessName: "My business",
  productsSold: "Add your products in Settings",
  businessDescription:
    "Add approved business information before enabling automatic replies.",
  tone: "friendly",
  autoReplyEnabled: false,
  autoSendConfidenceThreshold: 90,
};
export const monthKey = () => new Date().toISOString().slice(0, 7);
export const contextHash = (settings: BusinessSettings) =>
  digest(
    JSON.stringify([
      settings.businessName,
      settings.productsSold,
      settings.businessDescription,
      settings.tone,
    ]),
  );
const fullContextHash = (settings: BusinessSettings, fingerprint: string) =>
  digest(contextHash(settings) + fingerprint);
export const PAGE_SIZE = 200;
export interface PageCursor {
  lastAt: number;
  lastId: string;
  excludeId: string | null;
}
export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}
export function decodeCursor(value: string): PageCursor {
  let parsed: Partial<PageCursor> = {};
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(400, "The page cursor is not valid.");
  }
  const excludeId = parsed.excludeId ?? null;
  if (
    typeof parsed.lastAt !== "number" ||
    !Number.isFinite(parsed.lastAt) ||
    typeof parsed.lastId !== "string" ||
    !parsed.lastId ||
    (excludeId !== null && typeof excludeId !== "string")
  )
    throw new HttpError(400, "The page cursor is not valid.");
  return { lastAt: parsed.lastAt, lastId: parsed.lastId, excludeId };
}
export function entitlement(workspace: any) {
  const active =
    ["active", "trialing"].includes(workspace.billing_status) &&
    (workspace.plan !== "trial" || Number(workspace.trial_until) > Date.now());
  return {
    active,
    conversationLimit:
      workspace.plan === "growth"
        ? 5000
        : workspace.plan === "starter"
          ? 1000
          : 100,
    aiLimit:
      workspace.plan === "growth"
        ? 25000
        : workspace.plan === "starter"
          ? 5000
          : 200,
  };
}

export class ProductService {
  revenue: RevenueService;
  quality: QualityService;
  events = new EventEmitter();
  metrics = {
    received: 0,
    generated: 0,
    aiFailures: 0,
    delivered: 0,
    deliveryFailures: 0,
    emailFailures: 0,
    uncertain: 0,
    totalGenerationMs: 0,
  };
  constructor(
    public db: Database,
    public config: Config,
    public ai: AIEngine,
    public meta: MetaProvider,
  ) {
    this.events.setMaxListeners(1000);
    this.revenue = new RevenueService(db, (workspaceId) =>
      this.changed(workspaceId),
    );
    this.quality = new QualityService(this);
  }
  changed(workspaceId: string) {
    this.events.emit(workspaceId);
  }
  async redactAccountReceipts(
    platform: string,
    accountId: string,
    tx = this.db,
  ) {
    const receipts = await tx.query(
      "SELECT id,payload FROM webhook_receipts WHERE platform=$1 AND payload::text LIKE $2",
      [platform, `%${accountId}%`],
    );
    for (const receipt of receipts) {
      if (!Array.isArray(receipt.payload.entry)) continue;
      const entry =
        platform === "instagram"
          ? receipt.payload.entry.filter(
              (item: any) => String(item.id) !== accountId,
            )
          : receipt.payload.entry
              .map((item: any) => ({
                ...item,
                changes: (Array.isArray(item.changes)
                  ? item.changes
                  : []
                ).filter(
                  (change: any) =>
                    String(change?.value?.metadata?.phone_number_id) !==
                    accountId,
                ),
              }))
              .filter((item: any) => item.changes.length > 0);
      await tx.query("UPDATE webhook_receipts SET payload=$1 WHERE id=$2", [
        JSON.stringify({ ...receipt.payload, entry }),
        receipt.id,
      ]);
    }
  }
  async audit(
    workspaceId: string,
    actorId: string | null,
    action: string,
    resourceId?: string,
    detail: object = {},
    db = this.db,
  ) {
    await db.query(
      "INSERT INTO audit_events(id,workspace_id,actor_id,action,resource_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        workspaceId,
        actorId,
        action,
        resourceId || null,
        JSON.stringify(detail),
      ],
    );
  }
  async enqueue(
    kind: string,
    payload: object,
    workspaceId: string | null,
    id: string = randomUUID(),
    delay = 0,
    db = this.db,
  ) {
    await db.query(
      "INSERT INTO jobs(id,workspace_id,kind,payload,available_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      [id, workspaceId, kind, JSON.stringify(payload), Date.now() + delay],
    );
  }

  async conversationPage(
    actor: Actor,
    options: {
      includeId?: string | null;
      cursor?: PageCursor | null;
      limit?: number;
    } = {},
  ) {
    const limit = Math.min(
      Math.max(options.limit ?? PAGE_SIZE, 1),
      PAGE_SIZE,
    );
    const includeId = options.includeId ?? null;
    const cursor = options.cursor ?? null;
    // The promoted conversation already shipped on the first page; skipping it
    // later keeps every conversation in the stream exactly once.
    const excludeId = cursor ? cursor.excludeId : includeId;
    const rows = cursor
      ? await this.db.query(
          "SELECT * FROM conversations WHERE workspace_id=$1 AND (last_at,id) < ($2::bigint,$3::text) AND ($4::text IS NULL OR id <> $4::text) ORDER BY last_at DESC, id DESC LIMIT $5",
          [
            actor.workspaceId,
            cursor.lastAt,
            cursor.lastId,
            excludeId,
            limit + 1,
          ],
        )
      : await this.db.query(
          "SELECT * FROM conversations WHERE workspace_id=$1 ORDER BY (id=$2) DESC NULLS LAST, last_at DESC, id DESC LIMIT $3",
          [actor.workspaceId, includeId, limit + 1],
        );
    const display = rows.slice(0, limit);
    const boundary =
      [...display].reverse().find((row) => row.id !== includeId) ?? null;
    const nextCursor =
      rows.length > limit && boundary
        ? encodeCursor({
            lastAt: Number(boundary.last_at),
            lastId: String(boundary.id),
            excludeId,
          })
        : null;
    const ids = display.map((row) => String(row.id));
    const messages = ids.length
      ? await this.db.query(
          "SELECT * FROM (SELECT m.*,row_number() OVER (PARTITION BY conversation_id ORDER BY timestamp DESC,id DESC) AS n FROM messages m WHERE workspace_id=$1 AND conversation_id IN (SELECT jsonb_array_elements_text($2::jsonb))) limited WHERE n<=100 ORDER BY timestamp,id",
          [actor.workspaceId, JSON.stringify(ids)],
        )
      : [];
    const messageIds = messages.map((m) => String(m.id));
    const mediaFiles = messageIds.length
      ? await this.db.query(
          "SELECT id,message_id,mime_type,filename,size_bytes FROM media_files WHERE workspace_id=$1 AND message_id IN (SELECT jsonb_array_elements_text($2::jsonb))",
          [actor.workspaceId, JSON.stringify(messageIds)],
        )
      : [];
    const mediaMap = new Map(
      mediaFiles.map((m) => [m.message_id, m]),
    );
    const conversations = display.map((conversation) => {
      const history = messages
        .filter((message) => message.conversation_id === conversation.id)
        .map((message) => {
          const mf = mediaMap.get(message.id);
          return {
            id: message.id,
            conversationId: conversation.id,
            sender: message.sender,
            text: message.text,
            timestamp: Number(message.timestamp),
            deliveryStatus: message.status,
            deliveryError: message.error,
            automatic: message.automatic,
            media: mf
              ? {
                  id: mf.id,
                  mimeType: mf.mime_type,
                  filename: mf.filename,
                  sizeBytes: Number(mf.size_bytes),
                  url: `/api/media/${mf.id}`,
                }
              : null,
          };
        });
      const last = history[history.length - 1];
      return {
        id: conversation.id,
        contactName: conversation.name,
        contactAvatar: conversation.name
          .split(/\s+/)
          .map((word: string) => word[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        platform: conversation.platform,
        lastMessage: last?.text || "",
        lastMessageTime: Number(conversation.last_at),
        intent: conversation.intent,
        conversionStatus: conversation.status,
        messages: history,
        unread: conversation.unread,
        autoSendEnabled: conversation.auto_send,
        leadNotes: conversation.notes,
        leadMemory: conversation.memory,
        windowUntil: Number(conversation.window_until),
        aiError: conversation.ai_error,
        connectionId: conversation.connection_id,
      };
    });
    return { conversations, nextCursor };
  }

  async snapshot(actor: Actor, includeId: string | null = null) {
    const [workspace] = await this.db.query(
      "SELECT * FROM workspaces WHERE id=$1",
      [actor.workspaceId],
    );
    if (!workspace)
      throw new HttpError(401, "This workspace is no longer available.");
    const page = await this.conversationPage(actor, { includeId });
    const [drafts, suggestions, connections, usage, members, audit] =
      await Promise.all([
        this.db.query(
          "SELECT conversation_id,text FROM drafts WHERE workspace_id=$1 AND user_id=$2",
          [actor.workspaceId, actor.userId],
        ),
        this.db.query(
          "SELECT * FROM suggestions WHERE workspace_id=$1 AND status='ready' ORDER BY created_at DESC",
          [actor.workspaceId],
        ),
        this.db.query(
          "SELECT id,platform,account_id,label,status,error,expires_at FROM connections WHERE workspace_id=$1",
          [actor.workspaceId],
        ),
        this.db.query(
          "SELECT ai_replies FROM usage WHERE workspace_id=$1 AND month=$2",
          [actor.workspaceId, monthKey()],
        ),
        this.db.query(
          "SELECT u.id,u.email,u.name,m.role FROM members m JOIN users u ON m.user_id=u.id WHERE m.workspace_id=$1 ORDER BY m.role,u.name",
          [actor.workspaceId],
        ),
        this.db.query(
          "SELECT action,resource_id,detail,created_at FROM audit_events WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 20",
          [actor.workspaceId],
        ),
      ]);
    const [count] = await this.db.query(
      "SELECT count(*)::integer AS count FROM conversations WHERE workspace_id=$1 AND created_at>=date_trunc('month',now())",
      [actor.workspaceId],
    );
    const [failed] = await this.db.query(
      "SELECT count(*)::integer AS count FROM jobs WHERE workspace_id=$1 AND state='dead'",
      [actor.workspaceId],
    );
    const limits = entitlement(workspace);
    const brainContext = await this.revenue.context(actor.workspaceId);
    return {
      user: {
        id: actor.userId,
        email: actor.email,
        name: actor.name,
        verified: actor.verified,
        role: actor.role,
      },
      csrf: actor.csrf,
      workspace: {
        id: workspace.id,
        plan: workspace.plan,
        billingStatus: workspace.billing_status,
        trialUntil: Number(workspace.trial_until),
        ...limits,
      },
      settings: workspace.settings,
      conversations: page.conversations,
      nextCursor: page.nextCursor,
      drafts: Object.fromEntries(
        drafts.map((draft) => [draft.conversation_id, draft.text]),
      ),
      suggestions: suggestions.map((suggestion) => ({
        id: suggestion.id,
        conversationId: suggestion.conversation_id,
        sourceId: suggestion.source_id,
        text: suggestion.text,
        confidence: suggestion.confidence,
        safe:
          suggestion.safe &&
          suggestion.context_hash ===
            fullContextHash(workspace.settings, brainContext.fingerprint),
        reason:
          suggestion.context_hash ===
          fullContextHash(workspace.settings, brainContext.fingerprint)
            ? suggestion.reason
            : "Business context changed. Review this reply or generate again.",
        latencyMs: suggestion.latency_ms,
      })),
      connections: connections.map((connection) => ({
        id: connection.id,
        platform: connection.platform,
        label: connection.label,
        accountId: connection.account_id,
        status: connection.status,
        error: connection.error,
        expiresAt: connection.expires_at ? Number(connection.expires_at) : null,
      })),
      usage: {
        aiReplies: usage[0]?.ai_replies || 0,
        conversations: count.count,
        failedJobs: failed.count,
      },
      members,
      audit,
      capabilities: {
        ai: !!this.config.openaiKey,
        instagram: !!(
          this.config.instagramAppId &&
          this.config.instagramSecret &&
          this.config.verifyToken
        ),
        whatsapp: !!(this.config.metaSecret && this.config.verifyToken),
        billing: !!(this.config.stripeKey && this.config.stripeWebhookSecret),
        email: !!this.config.smtpHost,
        simulator: !this.config.production,
        storage: this.db.kind,
      },
    };
  }

  async connect(
    workspaceId: string,
    platform: string,
    accountId: string,
    label: string,
    token: string,
    expiresAt: number | null = null,
  ) {
    const [other] = await this.db.query(
      "SELECT workspace_id FROM connections WHERE platform=$1 AND account_id=$2",
      [platform, accountId],
    );
    if (other && other.workspace_id !== workspaceId)
      throw new HttpError(
        409,
        "This messaging account is already linked to another workspace.",
      );
    await this.db.query(
      "INSERT INTO connections(id,workspace_id,platform,account_id,label,token_cipher,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (workspace_id,platform) DO UPDATE SET account_id=EXCLUDED.account_id,label=EXCLUDED.label,token_cipher=EXCLUDED.token_cipher,expires_at=EXCLUDED.expires_at,status='connected',error=NULL,updated_at=now()",
      [
        randomUUID(),
        workspaceId,
        platform,
        accountId,
        label,
        encrypt(token, this.config.encryptionKey),
        expiresAt,
      ],
    );
    await this.audit(workspaceId, null, "account.connected", accountId, {
      platform,
    });
    this.changed(workspaceId);
  }

  async ingest(message: IncomingMessage) {
    const [connection] = await this.db.query(
      "SELECT * FROM connections WHERE platform=$1 AND account_id=$2 AND status='connected'",
      [message.platform, message.accountId],
    );
    if (!connection) return;
    const timestamp = Math.min(Date.now(), Math.max(0, message.timestamp));
    const risk = detectRisk(message.text);
    await this.db.transaction(async (tx) => {
      const [conversation] = await tx.query(
        "INSERT INTO conversations(id,workspace_id,connection_id,platform,external_id,name,last_at,window_until,intent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (workspace_id,platform,external_id) DO UPDATE SET connection_id=EXCLUDED.connection_id RETURNING *",
        [
          randomUUID(),
          connection.workspace_id,
          connection.id,
          message.platform,
          message.externalId,
          message.name,
          timestamp,
          timestamp + 86400000,
          risk === "spam" ? "spam" : "question",
        ],
      );
      const id = randomUUID();
      const inserted = await tx.query(
        "INSERT INTO messages(id,workspace_id,conversation_id,sender,text,timestamp,provider_id,connection_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (connection_id,provider_id) DO NOTHING RETURNING id",
        [
          id,
          connection.workspace_id,
          conversation.id,
          "contact",
          message.text,
          timestamp,
          message.providerId,
          connection.id,
        ],
      );
      if (!inserted.length) return;
      if (message.media && (message.media.id || message.media.url)) {
        try {
          const token = decrypt(
            connection.token_cipher,
            this.config.encryptionKey,
          );
          const downloaded = await this.meta.downloadMedia(
            message.media,
            token,
          );
          const mediaId = randomUUID();
          const cipher = encryptBuffer(
            downloaded.buffer,
            this.config.encryptionKey,
          );
          await tx.query(
            "INSERT INTO media_files(id,workspace_id,message_id,mime_type,filename,size_bytes,data_cipher) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [
              mediaId,
              connection.workspace_id,
              id,
              downloaded.mimeType,
              downloaded.filename || message.media.filename || null,
              downloaded.buffer.byteLength,
              cipher,
            ],
          );
        } catch {
          // Oversized or unsupported MIME types rejected before storage
        }
      }
      if (risk !== "spam")
        await this.revenue.ensure(connection.workspace_id, conversation.id, tx);
      await tx.query(
        "UPDATE conversations SET last_at=GREATEST(last_at,$1),window_until=GREATEST(window_until,$2),unread=true,ai_error=NULL,intent=CASE WHEN $3 THEN 'spam' ELSE intent END,updated_at=now() WHERE id=$4",
        [timestamp, timestamp + 86400000, risk === "spam", conversation.id],
      );
      if (!message.reviewOnly && risk !== "spam")
        await this.enqueue(
          "generate",
          { conversationId: conversation.id, sourceId: id },
          connection.workspace_id,
          `generate:${id}`,
          0,
          tx,
        );
      await this.audit(
        connection.workspace_id,
        null,
        "message.received",
        id,
        { platform: message.platform, reviewOnly: message.reviewOnly },
        tx,
      );
      this.metrics.received++;
    });
    this.changed(connection.workspace_id);
  }

  async delivery(update: DeliveryUpdate) {
    const [connection] = await this.db.query(
      "SELECT id,workspace_id FROM connections WHERE platform=$1 AND account_id=$2",
      [update.platform, update.accountId],
    );
    if (!connection) return;
    const [message] = await this.db.query(
      "SELECT * FROM messages WHERE workspace_id=$1 AND connection_id=$2 AND (provider_id=$3 OR id=$4)",
      [
        connection.workspace_id,
        connection.id,
        update.providerId,
        update.localId || "",
      ],
    );
    if (!message || message.sender === "contact") return;
    const rank: Record<string, number> = {
      queued: 0,
      sending: 1,
      uncertain: 1,
      sent: 2,
      failed: 2,
      delivered: 3,
      read: 4,
    };
    if ((rank[update.status] || 0) >= (rank[message.status] || 0))
      await this.db.query(
        "UPDATE messages SET status=$1,provider_id=$2,error=$3 WHERE id=$4 AND workspace_id=$5",
        [
          update.status,
          update.providerId,
          update.status === "failed"
            ? "Provider reported failed delivery."
            : null,
          message.id,
          connection.workspace_id,
        ],
      );
    this.changed(connection.workspace_id);
  }

  async generate(
    workspaceId: string,
    conversationId: string,
    sourceId: string,
  ) {
    const [conversation] = await this.db.query(
      "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2",
      [conversationId, workspaceId],
    );
    if (
      !conversation ||
      conversation.intent === "spam" ||
      conversation.status === "converted"
    )
      return;
    const messages = await this.db.query(
      "SELECT * FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 20",
      [conversationId, workspaceId],
    );
    if (messages[0]?.id !== sourceId || messages[0]?.sender !== "contact")
      return;
    const [existing] = await this.db.query(
      "SELECT id FROM suggestions WHERE source_id=$1",
      [sourceId],
    );
    if (existing) return;
    const [workspace] = await this.db.query(
      "SELECT * FROM workspaces WHERE id=$1",
      [workspaceId],
    );
    const limits = entitlement(workspace);
    if (!limits.active)
      throw new HttpError(
        402,
        "Your trial or subscription needs attention. You can still review and export your inbox.",
      );
    const [count] = await this.db.query(
      "SELECT count(*)::integer AS n FROM conversations WHERE workspace_id=$1 AND created_at>=date_trunc('month',now())",
      [workspaceId],
    );
    if (count.n > limits.conversationLimit)
      throw new HttpError(
        429,
        "Monthly conversation allowance reached. Messages are still retained for manual review.",
      );
    if (!this.config.openaiKey) throw new Error("AI_NOT_CONFIGURED");
    const brain = await this.revenue.context(workspaceId);
    if (
      brain.profile.industry === "medical" &&
      messages.some(
        (message) =>
          message.sender === "contact" && isClinical(message.text),
      )
    )
      throw new HttpError(
        409,
        "Clinical content requires a qualified human. No AI request was made.",
      );
    const reserved = await this.db.query(
      "INSERT INTO usage(workspace_id,month,ai_replies) VALUES($1,$2,1) ON CONFLICT (workspace_id,month) DO UPDATE SET ai_replies=usage.ai_replies+1 WHERE usage.ai_replies<$3 RETURNING ai_replies",
      [workspaceId, monthKey(), limits.aiLimit],
    );
    if (!reserved.length)
      throw new HttpError(
        429,
        "Monthly AI allowance reached. Replies can still be written manually.",
      );
    const [opportunity] = await this.db.query(
      "SELECT * FROM deals WHERE workspace_id=$1 AND conversation_id=$2",
      [workspaceId, conversationId],
    );
    const insight = opportunity
      ? await this.revenue.intelligence(workspaceId, opportunity)
      : null;
    const cohorts = await this.revenue.cohorts(workspaceId);
    const input: AIInput = {
      settings: workspace.settings,
      notes: conversation.notes,
      memory: conversation.memory,
      instructions: await this.quality.publishedInstructions(workspaceId),
      businessFacts: brain.facts,
      industry: brain.profile.industry,
      industryBoundary: brain.boundary,
      salesContext: JSON.stringify({
        guidance: brain.guidance,
        nextAction: insight?.nextAction,
        risks: insight?.risks,
        knownQualification: opportunity?.qualification,
        stageCohorts: cohorts,
        warning:
          "Heuristic recommendations and observational learning; never invent facts or claim these are causal.",
      }),
      messages: messages
        .reverse()
        .map((message) => ({ sender: message.sender, text: message.text })),
    };
    const started = performance.now();
    let result;
    try {
      result = guardReply(await this.ai.generate(input), input);
    } catch (error) {
      await this.db.query(
        "UPDATE usage SET ai_replies=GREATEST(ai_replies-1,0) WHERE workspace_id=$1 AND month=$2",
        [workspaceId, monthKey()],
      );
      throw error;
    }
    const latency = Math.round(performance.now() - started);
    const [currentWorkspace] = await this.db.query(
      "SELECT settings FROM workspaces WHERE id=$1",
      [workspaceId],
    );
    const currentBrain = await this.revenue.context(workspaceId);
    if (
      !currentWorkspace ||
      fullContextHash(currentWorkspace.settings, currentBrain.fingerprint) !==
        fullContextHash(input.settings, brain.fingerprint)
    ) {
      await this.db.query(
        "UPDATE usage SET ai_replies=GREATEST(ai_replies-1,0) WHERE workspace_id=$1 AND month=$2",
        [workspaceId, monthKey()],
      );
      throw new HttpError(
        409,
        "Business context changed during generation. Generate a new reply.",
      );
    }
    const [latest] = await this.db.query(
      "SELECT id FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 1",
      [conversationId, workspaceId],
    );
    if (latest?.id !== sourceId) {
      await this.db.query(
        "UPDATE usage SET ai_replies=GREATEST(ai_replies-1,0) WHERE workspace_id=$1 AND month=$2",
        [workspaceId, monthKey()],
      );
      return;
    }
    await this.db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO suggestions(id,workspace_id,conversation_id,source_id,text,confidence,safe,reason,model,latency_ms,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (source_id) DO NOTHING",
        [
          randomUUID(),
          workspaceId,
          conversationId,
          sourceId,
          result.text,
          result.confidence,
          result.safe,
          result.reason,
          this.config.openaiModel,
          latency,
          fullContextHash(input.settings, brain.fingerprint),
        ],
      );
      await tx.query(
        "UPDATE conversations SET intent=$1,memory=$2,ai_error=NULL,updated_at=now() WHERE id=$3 AND workspace_id=$4",
        [result.intent, result.memory, conversationId, workspaceId],
      );
      if (result.safe)
        await this.enqueue(
          "auto-send",
          { conversationId, sourceId },
          workspaceId,
          `auto:${sourceId}`,
          2500,
          tx,
        );
      await this.audit(
        workspaceId,
        null,
        "reply.generated",
        sourceId,
        {
          latencyMs: latency,
          safe: result.safe,
          confidence: result.confidence,
        },
        tx,
      );
    });
    this.metrics.generated++;
    this.metrics.totalGenerationMs += latency;
    this.changed(workspaceId);
  }

  async queueMessage(
    workspaceId: string,
    actorId: string | null,
    conversationId: string,
    text: string,
    key: string,
    sourceId?: string,
    automatic = false,
    hasMedia = false,
  ) {
    if (hasMedia) {
      throw new HttpError(
        400,
        "Outbound media is blocked until Meta template policy approval.",
      );
    }
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.query(
        "SELECT * FROM messages WHERE workspace_id=$1 AND client_key=$2",
        [workspaceId, key],
      );
      if (existing) {
        if (existing.text !== text)
          throw new HttpError(
            409,
            "This request key was already used for different content.",
          );
        return existing;
      }
      const [conversation] = await tx.query(
        "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2 FOR UPDATE",
        [conversationId, workspaceId],
      );
      if (!conversation) throw new HttpError(404, "Conversation not found.");
      if (!conversation.connection_id)
        throw new HttpError(
          409,
          "Connect the messaging account before sending.",
        );
      if (Number(conversation.window_until) <= Date.now())
        throw new HttpError(
          409,
          "The 24-hour reply window is closed. Wait for a new customer message.",
        );
      if (
        (conversation.platform === "instagram" &&
          Buffer.byteLength(text, "utf8") > 1000) ||
        text.length > 4096
      )
        throw new HttpError(
          400,
          conversation.platform === "instagram"
            ? "Instagram replies must fit within 1000 UTF-8 bytes."
            : "WhatsApp replies must be at most 4096 characters.",
        );
      const [last] = await tx.query(
        "SELECT * FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 1",
        [conversationId, workspaceId],
      );
      if (sourceId && last?.id !== sourceId)
        throw new HttpError(
          409,
          "This suggestion is no longer current. Review the latest message.",
        );
      const [pending] = await tx.query(
        "SELECT id FROM messages WHERE conversation_id=$1 AND workspace_id=$2 AND status IN ('queued','sending','uncertain')",
        [conversationId, workspaceId],
      );
      if (pending)
        throw new HttpError(
          409,
          "Resolve the pending delivery before sending another reply.",
        );
      if (
        automatic &&
        !(await this.autoAllowed(tx, workspaceId, conversation, sourceId!))
      )
        return null;
      const id = randomUUID();
      const [message] = await tx.query(
        "INSERT INTO messages(id,workspace_id,conversation_id,sender,text,timestamp,connection_id,status,client_key,source_id,automatic) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
        [
          id,
          workspaceId,
          conversationId,
          automatic || sourceId ? "ai" : "user",
          text,
          Math.max(Date.now(), Number(last?.timestamp || 0) + 1),
          conversation.connection_id,
          "queued",
          key,
          last?.sender === "contact" ? last.id : null,
          automatic,
        ],
      );
      await this.enqueue(
        "deliver",
        { messageId: id },
        workspaceId,
        `deliver:${id}`,
        0,
        tx,
      );
      if (actorId)
        await tx.query(
          "DELETE FROM drafts WHERE conversation_id=$1 AND user_id=$2 AND workspace_id=$3",
          [conversationId, actorId, workspaceId],
        );
      await tx.query(
        "UPDATE conversations SET unread=false,last_at=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3",
        [message.timestamp, conversationId, workspaceId],
      );
      if (last?.sender === "contact")
        await tx.query(
          "UPDATE suggestions SET status='approved' WHERE source_id=$1 AND workspace_id=$2",
          [last.id, workspaceId],
        );
      await this.audit(
        workspaceId,
        actorId,
        automatic ? "reply.auto_queued" : "reply.approved",
        id,
        {},
        tx,
      );
      return message;
    });
  }

  async autoAllowed(
    tx: Database,
    workspaceId: string,
    conversation: any,
    sourceId: string,
  ) {
    const [opportunity] = await tx.query(
      "SELECT escalated,stage FROM deals WHERE workspace_id=$1 AND conversation_id=$2",
      [workspaceId, conversation.id],
    );
    if (opportunity?.escalated || ["won", "lost"].includes(opportunity?.stage))
      return false;
    // A prompt version that failed a blocking evaluation stops automation here.
    if (await this.quality.isBlocked(workspaceId, tx)) return false;
    const inbound = await tx.query(
      "SELECT text FROM messages WHERE workspace_id=$1 AND conversation_id=$2 AND sender='contact' ORDER BY timestamp DESC LIMIT 30",
      [workspaceId, conversation.id],
    );
    if (inbound.some((message) => isOptOut(message.text))) return false;
    const [workspace] = await tx.query("SELECT * FROM workspaces WHERE id=$1", [
      workspaceId,
    ]);
    const [suggestion] = await tx.query(
      "SELECT * FROM suggestions WHERE source_id=$1 AND workspace_id=$2",
      [sourceId, workspaceId],
    );
    const brainProfile = await tx.query(
      "SELECT * FROM business_profiles WHERE workspace_id=$1",
      [workspaceId],
    );
    const activeEntries = await tx.query(
      "SELECT id,version,expires_at FROM brain_entries WHERE workspace_id=$1 AND approved=true AND (expires_at IS NULL OR expires_at>$2) ORDER BY updated_at DESC,id",
      [workspaceId, Date.now()],
    );
    const knowledgeLinks = await tx.query(
      "SELECT from_id,to_id,relation FROM brain_links WHERE workspace_id=$1 ORDER BY id",
      [workspaceId],
    );
    const entryIds = new Set(activeEntries.map((entry) => entry.id));
    // The shape must match RevenueService.profile() exactly: the fingerprint
    // below is compared with the one stored on the suggestion.
    const profile = brainProfile[0]
      ? {
          industry: brainProfile[0].industry,
          currency: brainProfile[0].currency,
          autoStage: brainProfile[0].auto_stage,
          sectorFields: Array.isArray(brainProfile[0].sector_fields)
            ? brainProfile[0].sector_fields
            : [],
        }
      : {
          industry: "general",
          currency: "USD",
          autoStage: false,
          sectorFields: [],
        };
    if (inbound.some((message) => detectRisk(message.text))) return false;
    if (
      profile.industry === "medical" &&
      inbound.some((message) => isClinical(message.text))
    )
      return false;
    const brainFingerprint = digest(
      JSON.stringify({
        profile,
        entries: activeEntries.map((entry) => [
          entry.id,
          entry.version,
          entry.expires_at === null ? null : Number(entry.expires_at),
        ]),
        links: knowledgeLinks
          .filter(
            (link) => entryIds.has(link.from_id) && entryIds.has(link.to_id),
          )
          .map((link) => [link.from_id, link.to_id, link.relation]),
      }),
    );
    const [draft] = await tx.query(
      "SELECT conversation_id FROM drafts WHERE conversation_id=$1 AND workspace_id=$2 AND trim(text)<>'' LIMIT 1",
      [conversation.id, workspaceId],
    );
    return !!(
      workspace &&
      entitlement(workspace).active &&
      workspace.settings.autoReplyEnabled &&
      conversation.auto_send &&
      conversation.intent !== "spam" &&
      conversation.status !== "converted" &&
      !draft &&
      Number(conversation.hold_until) < Date.now() &&
      suggestion?.safe &&
      suggestion.context_hash ===
        fullContextHash(workspace.settings, brainFingerprint) &&
      suggestion.status === "ready" &&
      suggestion.confidence >= workspace.settings.autoSendConfidenceThreshold
    );
  }

  async deliver(workspaceId: string, messageId: string) {
    const [message] = await this.db.query(
      "SELECT m.*,c.external_id,c.platform,c.window_until,c.intent,c.status AS lead_status FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.id=$1 AND m.workspace_id=$2",
      [messageId, workspaceId],
    );
    if (
      !message ||
      ["sent", "delivered", "read", "uncertain", "cancelled"].includes(
        message.status,
      )
    )
      return;
    if (message.status === "sending") {
      await this.db.query(
        "UPDATE messages SET status='uncertain',error='A delivery was interrupted. Check the provider inbox before sending again.' WHERE id=$1 AND workspace_id=$2",
        [messageId, workspaceId],
      );
      this.changed(workspaceId);
      return;
    }
    const [connection] = await this.db.query(
      "SELECT * FROM connections WHERE id=$1 AND workspace_id=$2",
      [message.connection_id, workspaceId],
    );
    if (
      !connection ||
      connection.status !== "connected" ||
      Number(message.window_until) < Date.now()
    ) {
      await this.failMessage(
        workspaceId,
        messageId,
        "Delivery blocked: reconnect the account or wait for a new inbound message.",
      );
      return;
    }
    if (connection.account_id.startsWith("local-")) {
      await this.failMessage(
        workspaceId,
        messageId,
        "Local simulator: no real provider delivery was attempted.",
      );
      return;
    }
    if (message.automatic) {
      const [conversation] = await this.db.query(
        "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2",
        [message.conversation_id, workspaceId],
      );
      // Re-evaluate policy after the outbox delay, including a human draft/hold added meanwhile.
      await this.db.query(
        "UPDATE suggestions SET status='ready' WHERE source_id=$1 AND workspace_id=$2 AND status='approved'",
        [message.source_id, workspaceId],
      );
      const [latestInbound] = await this.db.query(
        "SELECT id FROM messages WHERE conversation_id=$1 AND workspace_id=$2 AND sender='contact' ORDER BY timestamp DESC,id DESC LIMIT 1",
        [message.conversation_id, workspaceId],
      );
      const allowed =
        latestInbound?.id === message.source_id &&
        (await this.autoAllowed(
          this.db,
          workspaceId,
          conversation,
          message.source_id,
        ));
      await this.db.query(
        "UPDATE suggestions SET status=$1 WHERE source_id=$2 AND workspace_id=$3",
        [allowed ? "approved" : "ready", message.source_id, workspaceId],
      );
      if (!allowed) {
        await this.db.query(
          "UPDATE messages SET status='cancelled',error='Automation paused for review.' WHERE id=$1 AND workspace_id=$2",
          [messageId, workspaceId],
        );
        this.changed(workspaceId);
        return;
      }
    }
    const claimed = await this.db.query(
      "UPDATE messages SET status='sending' WHERE id=$1 AND workspace_id=$2 AND status='queued' RETURNING id",
      [messageId, workspaceId],
    );
    if (!claimed.length) return;
    try {
      const providerId = await this.meta.send(
        message.platform,
        connection.account_id,
        message.external_id,
        decrypt(connection.token_cipher, this.config.encryptionKey),
        message.text,
        messageId,
      );
      await this.db.query(
        "UPDATE messages SET status=CASE WHEN status IN ('delivered','read') THEN status ELSE 'sent' END,provider_id=$1,error=NULL WHERE id=$2 AND workspace_id=$3",
        [providerId, messageId, workspaceId],
      );
      await this.audit(workspaceId, null, "message.accepted", messageId);
      this.metrics.delivered++;
    } catch (error) {
      const failure =
        error instanceof ProviderError
          ? error
          : new ProviderError("Delivery outcome needs review.", false, true);
      await this.db.query(
        "UPDATE messages SET status=$1,error=$2 WHERE id=$3 AND workspace_id=$4",
        [
          failure.retrySafe
            ? "queued"
            : failure.ambiguous
              ? "uncertain"
              : "failed",
          failure.message,
          messageId,
          workspaceId,
        ],
      );
      if (failure.authError)
        await this.db.query(
          "UPDATE connections SET status='reconnect',error=$1 WHERE id=$2 AND workspace_id=$3",
          [failure.message, connection.id, workspaceId],
        );
      if (failure.ambiguous) this.metrics.uncertain++;
      else this.metrics.deliveryFailures++;
      if (failure.retrySafe) throw failure;
    } finally {
      this.changed(workspaceId);
    }
  }

  async failMessage(workspaceId: string, messageId: string, reason: string) {
    await this.db.query(
      "UPDATE messages SET status='failed',error=$1 WHERE id=$2 AND workspace_id=$3",
      [reason, messageId, workspaceId],
    );
    this.changed(workspaceId);
  }
}
