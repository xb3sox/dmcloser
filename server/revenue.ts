import { randomUUID } from "node:crypto";
import type { Database } from "./db.ts";
import { digest, HttpError } from "./security.ts";
import type { Actor } from "./service.ts";
import {
  money,
  type Appointment,
  type BrainEntry,
  type BrainLink,
  type BusinessProfile,
  type Deal,
  type DealDetail,
  type DealQuote,
  type DealStage,
  type RecoveryEntry,
  type RecoveryList,
  type RevenueOverview,
  type SalesTask,
} from "../src/types/revenue.ts";
import {
  industryGuidance,
  scoreLead,
  scoringVersion,
} from "../src/domain/revenue.ts";

export const defaultProfile: BusinessProfile = {
  industry: "general",
  currency: "USD",
  autoStage: false,
  sectorFields: [],
};
const entryView = (row: any): BrainEntry => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  content: row.content,
  priceMinor: row.price_minor === null ? null : Number(row.price_minor),
  currency: row.currency,
  approved: row.approved,
  expiresAt: row.expires_at === null ? null : Number(row.expires_at),
  version: row.version,
});
const dealView = (row: any): Deal => ({
  id: row.id,
  conversationId: row.conversation_id,
  stage: row.stage,
  valueMinor: row.value_minor === null ? null : Number(row.value_minor),
  currency: row.currency,
  expectedClose: row.expected_close
    ? String(
        row.expected_close instanceof Date
          ? row.expected_close.toISOString()
          : row.expected_close,
      ).slice(0, 10)
    : null,
  productId: row.product_id,
  qualification: row.qualification,
  campaign: row.campaign,
  source: row.source,
  escalated: row.escalated,
  escalationReason: row.escalation_reason,
  version: row.version,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});
const taskView = (row: any): SalesTask => ({
  id: row.id,
  kind: row.kind,
  dueAt: Number(row.due_at),
  status: row.status,
  text: row.text,
  reason: row.reason,
});
const appointmentView = (row: any): Appointment => ({
  id: row.id,
  title: row.title,
  startAt: Number(row.start_at),
  endAt: Number(row.end_at),
  resource: row.resource,
  status: row.status,
});
const quoteView = (row: any): DealQuote => ({
  id: row.id,
  totalMinor: Number(row.total_minor),
  currency: row.currency,
  status: row.status,
  lines: row.lines,
  expiresAt: Number(row.expires_at),
  text: row.text,
});

export class RevenueService {
  constructor(
    public db: Database,
    private changed: (workspaceId: string) => void,
  ) {}
  async profile(workspaceId: string, tx = this.db): Promise<BusinessProfile> {
    const [row] = await tx.query(
      "SELECT * FROM business_profiles WHERE workspace_id=$1",
      [workspaceId],
    );
    return row
      ? {
          industry: row.industry,
          currency: row.currency,
          autoStage: row.auto_stage,
          sectorFields: Array.isArray(row.sector_fields)
            ? row.sector_fields
            : [],
        }
      : { ...defaultProfile };
  }
  async event(
    workspaceId: string,
    actorId: string | null,
    action: string,
    resource: string,
    detail: object = {},
    tx = this.db,
  ) {
    await tx.query(
      "INSERT INTO audit_events(id,workspace_id,actor_id,action,resource_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        workspaceId,
        actorId,
        action,
        resource,
        JSON.stringify(detail),
      ],
    );
  }
  async brain(workspaceId: string) {
    const [profile, entries, links] = await Promise.all([
      this.profile(workspaceId),
      this.db.query(
        "SELECT * FROM brain_entries WHERE workspace_id=$1 ORDER BY updated_at DESC,id",
        [workspaceId],
      ),
      this.db.query(
        "SELECT * FROM brain_links WHERE workspace_id=$1 ORDER BY id",
        [workspaceId],
      ),
    ]);
    return {
      profile,
      entries: entries.map(entryView),
      links: links.map(
        (row): BrainLink => ({
          id: row.id,
          fromId: row.from_id,
          toId: row.to_id,
          relation: row.relation,
        }),
      ),
      guidance: industryGuidance[profile.industry],
    };
  }
  async updateProfile(actor: Actor, input: BusinessProfile) {
    await this.db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO business_profiles(workspace_id,industry,currency,auto_stage,sector_fields) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(workspace_id) DO UPDATE SET industry=EXCLUDED.industry,currency=EXCLUDED.currency,auto_stage=EXCLUDED.auto_stage,sector_fields=EXCLUDED.sector_fields,updated_at=now()",
        [
          actor.workspaceId,
          input.industry,
          input.currency,
          input.autoStage,
          JSON.stringify(input.sectorFields),
        ],
      );
      await tx.query(
        "UPDATE suggestions SET safe=false,reason='Business profile changed. Generate a new reply.' WHERE workspace_id=$1 AND status='ready'",
        [actor.workspaceId],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "brain.profile_updated",
        actor.workspaceId,
        { industry: input.industry, sectorFields: input.sectorFields.length },
        tx,
      );
    });
    this.changed(actor.workspaceId);
    return input;
  }
  async saveEntry(
    actor: Actor,
    id: string | null,
    input: Omit<BrainEntry, "id" | "version"> & { version?: number },
  ) {
    const result = await this.db.transaction(async (tx) => {
      if (
        input.priceMinor !== null &&
        !["product", "service", "offer"].includes(input.kind)
      )
        throw new HttpError(
          400,
          "Only products, services and offers can have prices.",
        );
      if (input.approved && input.expiresAt && input.expiresAt <= Date.now())
        throw new HttpError(400, "Expired knowledge cannot be approved.");
      let row;
      if (id) {
        const [current] = await tx.query(
          "SELECT * FROM brain_entries WHERE id=$1 AND workspace_id=$2 FOR UPDATE",
          [id, actor.workspaceId],
        );
        if (!current) throw new HttpError(404, "Knowledge entry not found.");
        if (current.version !== input.version)
          throw new HttpError(
            409,
            "This entry changed. Refresh before saving.",
          );
        [row] = await tx.query(
          "UPDATE brain_entries SET kind=$1,title=$2,content=$3,price_minor=$4,currency=$5,approved=$6,expires_at=$7,version=version+1,updated_at=now() WHERE id=$8 AND workspace_id=$9 RETURNING *",
          [
            input.kind,
            input.title,
            input.content,
            input.priceMinor,
            input.currency,
            input.approved,
            input.expiresAt,
            id,
            actor.workspaceId,
          ],
        );
      } else {
        [row] = await tx.query(
          "INSERT INTO brain_entries(id,workspace_id,kind,title,content,price_minor,currency,approved,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          [
            randomUUID(),
            actor.workspaceId,
            input.kind,
            input.title,
            input.content,
            input.priceMinor,
            input.currency,
            input.approved,
            input.expiresAt,
          ],
        );
      }
      await tx.query(
        "UPDATE suggestions SET safe=false,reason='Approved knowledge changed. Generate again.' WHERE workspace_id=$1 AND status='ready'",
        [actor.workspaceId],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "brain.entry_saved",
        row.id,
        { kind: input.kind, approved: input.approved, version: row.version },
        tx,
      );
      return entryView(row);
    });
    this.changed(actor.workspaceId);
    return result;
  }
  async deleteEntry(actor: Actor, id: string) {
    await this.db.transaction(async (tx) => {
      const rows = await tx.query(
        "DELETE FROM brain_entries WHERE id=$1 AND workspace_id=$2 RETURNING id",
        [id, actor.workspaceId],
      );
      if (!rows.length) throw new HttpError(404, "Knowledge entry not found.");
      await tx.query(
        "UPDATE deals SET product_id=NULL,version=version+1 WHERE workspace_id=$1 AND product_id=$2",
        [actor.workspaceId, id],
      );
      await tx.query(
        "UPDATE suggestions SET safe=false WHERE workspace_id=$1 AND status='ready'",
        [actor.workspaceId],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "brain.entry_deleted",
        id,
        {},
        tx,
      );
    });
    this.changed(actor.workspaceId);
  }
  async link(
    actor: Actor,
    input: { fromId: string; toId: string; relation: BrainLink["relation"] },
  ) {
    const result = await this.db.transaction(async (tx) => {
      const entries = await tx.query(
        "SELECT id FROM brain_entries WHERE workspace_id=$1 AND id IN ($2,$3)",
        [actor.workspaceId, input.fromId, input.toId],
      );
      if (entries.length !== 2)
        throw new HttpError(
          404,
          "Both knowledge entries must belong to this workspace.",
        );
      const [row] = await tx.query(
        "INSERT INTO brain_links(id,workspace_id,from_id,to_id,relation) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id,from_id,to_id,relation) DO UPDATE SET relation=EXCLUDED.relation RETURNING *",
        [
          randomUUID(),
          actor.workspaceId,
          input.fromId,
          input.toId,
          input.relation,
        ],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "brain.relationship_added",
        row.id,
        {},
        tx,
      );
      return row;
    });
    this.changed(actor.workspaceId);
    return result;
  }
  async ensure(workspaceId: string, conversationId: string, tx = this.db) {
    const [conversation] = await tx.query(
      "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2",
      [conversationId, workspaceId],
    );
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    if (conversation.intent === "spam") return null;
    const profile = await this.profile(workspaceId, tx);
    const [row] = await tx.query(
      "INSERT INTO deals(id,workspace_id,conversation_id,stage,currency,source) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(conversation_id) DO UPDATE SET conversation_id=EXCLUDED.conversation_id RETURNING *",
      [
        randomUUID(),
        workspaceId,
        conversationId,
        conversation.status === "qualified" ? "qualified" : "new",
        profile.currency,
        conversation.platform,
      ],
    );
    return row;
  }
  async getDeal(workspaceId: string, id: string, tx = this.db, lock = false) {
    const [row] = await tx.query(
      `SELECT * FROM deals WHERE id=$1 AND workspace_id=$2${lock ? " FOR UPDATE" : ""}`,
      [id, workspaceId],
    );
    if (!row) throw new HttpError(404, "Opportunity not found.");
    return row;
  }
  async cohorts(workspaceId: string) {
    const rows = await this.db.query(
      "SELECT snapshot->>'stageBefore' AS stage,count(*) FILTER(WHERE outcome='won')::integer AS won,count(*) FILTER(WHERE outcome='lost')::integer AS lost FROM deal_outcomes WHERE workspace_id=$1 AND snapshot->>'industry'=COALESCE((SELECT industry FROM business_profiles WHERE workspace_id=$1),'general') GROUP BY snapshot->>'stageBefore'",
      [workspaceId],
    );
    return rows.map((row) => ({
      stage: row.stage,
      won: row.won,
      lost: row.lost,
      rate:
        row.won + row.lost >= 10
          ? (row.won + 1) / (row.won + row.lost + 2)
          : null,
    }));
  }
  async intelligence(workspaceId: string, row: any) {
    const [conversation] = await this.db.query(
      "SELECT intent FROM conversations WHERE id=$1 AND workspace_id=$2",
      [row.conversation_id, workspaceId],
    );
    const [messages, brain, cohorts, lossCounts] = await Promise.all([
      this.db.query(
        "SELECT id,sender,text,timestamp FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 100",
        [row.conversation_id, workspaceId],
      ),
      this.brain(workspaceId),
      this.cohorts(workspaceId),
      this.db.query(
        "SELECT count(*)::integer AS n FROM deal_outcomes WHERE workspace_id=$1 AND outcome='lost' AND reason='price' AND snapshot->>'industry'=COALESCE((SELECT industry FROM business_profiles WHERE workspace_id=$1),'general')",
        [workspaceId],
      ),
    ]);
    return scoreLead(
      dealView(row),
      {
        intent: conversation?.intent || "question",
        messages: messages.reverse().map((message) => ({
          id: message.id,
          sender: message.sender,
          text: message.text,
          timestamp: Number(message.timestamp),
        })),
      },
      brain.entries,
      brain.profile.industry,
      cohorts,
      Date.now(),
      { priceLosses: lossCounts[0].n },
    );
  }
  async detail(
    workspaceId: string,
    conversationId: string,
  ): Promise<DealDetail> {
    const row = await this.ensure(workspaceId, conversationId);
    if (!row)
      throw new HttpError(409, "Spam does not create a sales opportunity.");
    const [insight, quotes, appointments, tasks, outcomes, payments] =
      await Promise.all([
        this.intelligence(workspaceId, row),
        this.db.query(
          "SELECT * FROM deal_quotes WHERE workspace_id=$1 AND deal_id=$2 ORDER BY created_at DESC",
          [workspaceId, row.id],
        ),
        this.db.query(
          "SELECT * FROM appointments WHERE workspace_id=$1 AND deal_id=$2 ORDER BY start_at",
          [workspaceId, row.id],
        ),
        this.db.query(
          "SELECT * FROM sales_tasks WHERE workspace_id=$1 AND deal_id=$2 ORDER BY due_at",
          [workspaceId, row.id],
        ),
        this.db.query(
          "SELECT * FROM deal_outcomes WHERE workspace_id=$1 AND deal_id=$2",
          [workspaceId, row.id],
        ),
        this.db.query(
          "SELECT r.*, (v.id IS NOT NULL) AS voided FROM revenue_events r LEFT JOIN revenue_voids v ON v.revenue_event_id=r.id AND v.workspace_id=r.workspace_id WHERE r.workspace_id=$1 AND r.deal_id=$2 ORDER BY r.occurred_at",
          [workspaceId, row.id],
        ),
      ]);
    const outcome = outcomes[0];
    return {
      deal: dealView(row),
      insight,
      quotes: quotes.map(quoteView),
      appointments: appointments.map(appointmentView),
      tasks: tasks.map(taskView),
      outcome: outcome
        ? {
            id: outcome.id,
            outcome: outcome.outcome,
            reason: outcome.reason,
            note: outcome.note,
            valueMinor:
              outcome.value_minor === null ? null : Number(outcome.value_minor),
            currency: outcome.currency,
            createdAt: new Date(outcome.created_at).toISOString(),
          }
        : null,
      payments: payments.map((payment) => ({
        id: payment.id,
        kind: payment.kind,
        amountMinor: Number(payment.amount_minor),
        reference: payment.reference,
        occurredAt: Number(payment.occurred_at),
        voided: Boolean(payment.voided),
      })),
    };
  }
  async updateDeal(
    actor: Actor,
    id: string,
    input: Partial<Deal> & { version: number },
  ) {
    await this.db.transaction(async (tx) => {
      const row = await this.getDeal(actor.workspaceId, id, tx, true);
      if (row.version !== input.version)
        throw new HttpError(
          409,
          "This opportunity changed. Refresh before saving.",
        );
      if (["won", "lost"].includes(row.stage))
        throw new HttpError(
          409,
          "Closed outcomes are immutable. Record financial adjustments separately.",
        );
      if (input.productId) {
        const [entry] = await tx.query(
          "SELECT * FROM brain_entries WHERE id=$1 AND workspace_id=$2",
          [input.productId, actor.workspaceId],
        );
        if (!entry || !["product", "service"].includes(entry.kind))
          throw new HttpError(404, "Product or service not found.");
      }
      const q = input.qualification || row.qualification;
      const profile = await this.profile(actor.workspaceId, tx);
      let stage = input.stage || row.stage;
      if (
        profile.autoStage &&
        stage === "new" &&
        q.budgetMinor > 0 &&
        q.authority === "decision_maker" &&
        q.need &&
        q.timelineDate
      )
        stage = "qualified";
      const campaign = input.campaign ?? row.campaign;
      await tx.query(
        "UPDATE deals SET stage=$1,value_minor=$2,currency=$3,expected_close=$4,product_id=$5,qualification=$6,campaign=$7,version=version+1,updated_at=now() WHERE id=$8 AND workspace_id=$9",
        [
          stage,
          input.valueMinor === undefined ? row.value_minor : input.valueMinor,
          input.currency || row.currency,
          input.expectedClose === undefined
            ? row.expected_close
            : input.expectedClose,
          input.productId === undefined ? row.product_id : input.productId,
          JSON.stringify(q),
          campaign,
          id,
          actor.workspaceId,
        ],
      );
      await tx.query(
        "INSERT INTO deal_events(id,workspace_id,deal_id,actor_id,kind,data) VALUES($1,$2,$3,$4,$5,$6)",
        [
          randomUUID(),
          actor.workspaceId,
          id,
          actor.userId,
          "updated",
          JSON.stringify({
            stageFrom: row.stage,
            stageTo: stage,
            qualificationConfirmed: !!input.qualification,
            attributionSource:
              input.campaign !== undefined ? "owner-entered" : undefined,
          }),
        ],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "deal.updated",
        id,
        { stage },
        tx,
      );
      if (stage === "qualified")
        await tx.query(
          "UPDATE conversations SET status='qualified' WHERE id=$1 AND workspace_id=$2 AND status NOT IN ('converted','lost')",
          [row.conversation_id, actor.workspaceId],
        );
    });
    this.changed(actor.workspaceId);
    return dealView(await this.getDeal(actor.workspaceId, id));
  }
  async close(
    actor: Actor,
    id: string,
    input: {
      version: number;
      outcome: "won" | "lost";
      reason: string;
      note: string;
    },
  ) {
    const rowBefore = await this.getDeal(actor.workspaceId, id);
    const insight = await this.intelligence(actor.workspaceId, rowBefore);
    await this.db.transaction(async (tx) => {
      const row = await this.getDeal(actor.workspaceId, id, tx, true);
      if (row.version !== input.version || ["won", "lost"].includes(row.stage))
        throw new HttpError(409, "Opportunity changed or was already closed.");
      const [profile, messages] = await Promise.all([
        this.profile(actor.workspaceId, tx),
        tx.query(
          "SELECT id FROM messages WHERE conversation_id=$1 AND workspace_id=$2 AND sender<>'contact' AND status IN ('sent','delivered','read') ORDER BY timestamp DESC LIMIT 20",
          [row.conversation_id, actor.workspaceId],
        ),
      ]);
      await tx.query(
        "INSERT INTO deal_outcomes(id,workspace_id,deal_id,outcome,reason,note,value_minor,currency,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          randomUUID(),
          actor.workspaceId,
          id,
          input.outcome,
          input.reason,
          input.note,
          row.value_minor,
          row.currency,
          JSON.stringify({
            version: scoringVersion,
            stageBefore: row.stage,
            score: insight.score,
            probability: insight.probability,
            industry: profile.industry,
            objections: insight.objections,
            messageIds: messages.map((message) => message.id),
            source: row.source,
            campaign: row.campaign,
          }),
        ],
      );
      await tx.query(
        "UPDATE deals SET stage=$1,version=version+1,updated_at=now() WHERE id=$2 AND workspace_id=$3",
        [input.outcome, id, actor.workspaceId],
      );
      await tx.query(
        "UPDATE conversations SET status=$1,auto_send=false WHERE id=$2 AND workspace_id=$3",
        [
          input.outcome === "won" ? "converted" : "lost",
          row.conversation_id,
          actor.workspaceId,
        ],
      );
      await tx.query(
        "UPDATE sales_tasks SET status='cancelled',reason='Opportunity closed.' WHERE workspace_id=$1 AND deal_id=$2 AND status IN ('scheduled','ready')",
        [actor.workspaceId, id],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        `deal.${input.outcome}`,
        id,
        { reason: input.reason },
        tx,
      );
    });
    this.changed(actor.workspaceId);
  }
  async payment(
    actor: Actor,
    id: string,
    input: {
      kind: "payment" | "refund";
      amountMinor: number;
      reference: string;
      occurredAt: number;
    },
    key: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const row = await this.getDeal(actor.workspaceId, id, tx, true);
      if (row.stage !== "won")
        throw new HttpError(
          409,
          "Record a won outcome before recording received revenue.",
        );
      const [existing] = await tx.query(
        "SELECT * FROM revenue_events WHERE workspace_id=$1 AND client_key=$2",
        [actor.workspaceId, key],
      );
      if (existing) {
        if (
          existing.deal_id !== id ||
          Number(existing.amount_minor) !== input.amountMinor ||
          existing.reference !== input.reference ||
          existing.kind !== input.kind
        )
          throw new HttpError(
            409,
            "Idempotency key was used for different payment data.",
          );
        return existing.id;
      }
      const [sum] = await tx.query(
        "SELECT COALESCE(sum(CASE WHEN kind='payment' THEN amount_minor ELSE -amount_minor END),0) AS net FROM revenue_events r LEFT JOIN revenue_voids v ON v.revenue_event_id=r.id AND v.workspace_id=r.workspace_id WHERE r.workspace_id=$1 AND r.deal_id=$2 AND v.id IS NULL",
        [actor.workspaceId, id],
      );
      if (input.kind === "refund" && input.amountMinor > Number(sum.net))
        throw new HttpError(
          409,
          "Refund cannot exceed the confirmed amount received.",
        );
      const paymentId = randomUUID();
      await tx.query(
        "INSERT INTO revenue_events(id,workspace_id,deal_id,kind,amount_minor,currency,reference,occurred_at,client_key,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          paymentId,
          actor.workspaceId,
          id,
          input.kind,
          input.amountMinor,
          row.currency,
          input.reference,
          input.occurredAt,
          key,
          actor.userId,
        ],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "revenue.confirmed",
        paymentId,
        { kind: input.kind, source: "owner-confirmed" },
        tx,
      );
      return paymentId;
    });
    this.changed(actor.workspaceId);
    return { id: result };
  }
  async voidPayment(actor: Actor, revenueEventId: string, reason: string) {
    const voidId = await this.db.transaction(async (tx) => {
      const [event] = await tx.query(
        "SELECT * FROM revenue_events WHERE id=$1 AND workspace_id=$2",
        [revenueEventId, actor.workspaceId],
      );
      if (!event) throw new HttpError(404, "Revenue event not found.");
      const [existing] = await tx.query(
        "SELECT * FROM revenue_voids WHERE revenue_event_id=$1 AND workspace_id=$2",
        [revenueEventId, actor.workspaceId],
      );
      if (existing)
        throw new HttpError(409, "Revenue event is already voided.");
      const id = randomUUID();
      await tx.query(
        "INSERT INTO revenue_voids(id,workspace_id,revenue_event_id,reason,actor_id) VALUES($1,$2,$3,$4,$5)",
        [id, actor.workspaceId, revenueEventId, reason, actor.userId],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "revenue.voided",
        revenueEventId,
        {
          voidId: id,
          reason,
          kind: event.kind,
          amountMinor: Number(event.amount_minor),
          reference: event.reference,
        },
        tx,
      );
      return id;
    });
    this.changed(actor.workspaceId);
    return { ok: true, id: voidId };
  }
  async overview(
    workspaceId: string,
    currency: string,
  ): Promise<RevenueOverview> {
    const profile = await this.profile(workspaceId);
    await this.db.query(
      "INSERT INTO deals(id,workspace_id,conversation_id,stage,currency,source) SELECT 'opportunity-'||id,workspace_id,id,CASE WHEN status='qualified' THEN 'qualified' ELSE 'new' END,$2,platform FROM conversations WHERE workspace_id=$1 AND intent<>'spam' AND status NOT IN ('converted','lost') ON CONFLICT(conversation_id) DO NOTHING",
      [workspaceId, profile.currency],
    );
    const [rows, brain, cohorts, outcomes, payments, helpful, messages] =
      await Promise.all([
        this.db.query(
          "SELECT d.*,c.name,c.platform,c.intent FROM deals d JOIN conversations c ON c.id=d.conversation_id AND c.workspace_id=d.workspace_id WHERE d.workspace_id=$1",
          [workspaceId],
        ),
        this.brain(workspaceId),
        this.cohorts(workspaceId),
        this.db.query("SELECT * FROM deal_outcomes WHERE workspace_id=$1", [
          workspaceId,
        ]),
        this.db.query(
          "SELECT r.*,d.source,d.campaign,c.name FROM revenue_events r JOIN deals d ON d.id=r.deal_id AND d.workspace_id=r.workspace_id JOIN conversations c ON c.id=d.conversation_id AND c.workspace_id=d.workspace_id LEFT JOIN revenue_voids v ON v.revenue_event_id=r.id AND v.workspace_id=r.workspace_id WHERE r.workspace_id=$1 AND v.id IS NULL",
          [workspaceId],
        ),
        this.db.query(
          "SELECT count(*)::integer AS n FROM reply_feedback WHERE workspace_id=$1 AND label='helpful'",
          [workspaceId],
        ),
        this.db.query(
          "SELECT id,conversation_id,sender,text,timestamp FROM (SELECT m.*,row_number() OVER(PARTITION BY conversation_id ORDER BY timestamp DESC,id DESC) AS n FROM messages m WHERE workspace_id=$1 AND sender='contact') scoped WHERE n<=30 ORDER BY timestamp",
          [workspaceId],
        ),
      ]);
    const now = Date.now(),
      start = new Date(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        1,
      );
    const from = Date.UTC(start.getFullYear(), start.getMonth(), 1),
      horizon = now + 30 * 86400000;
    const industryOutcomes = outcomes.filter(
      (outcome) => outcome.snapshot.industry === profile.industry,
    );
    // ⚡ Bolt Optimization: Group messages by conversation ID once (O(M)) to avoid nested filtering (O(D*M))
    const messagesByConversation = new Map<string, any[]>();
    for (const message of messages) {
      const list = messagesByConversation.get(message.conversation_id) || [];
      list.push(message);
      messagesByConversation.set(message.conversation_id, list);
    }
    const opportunities = rows
      .map((row) => ({
        deal: dealView(row),
        name: row.name,
        platform: row.platform,
        insight: scoreLead(
          dealView(row),
          {
            intent: row.intent,
            messages: (messagesByConversation.get(row.conversation_id) || [])
              .map((message) => ({
                id: message.id,
                sender: message.sender,
                text: message.text,
                timestamp: Number(message.timestamp),
              })),
          },
          brain.entries,
          profile.industry,
          cohorts,
          now,
          {
            priceLosses: industryOutcomes.filter(
              (outcome) =>
                outcome.outcome === "lost" && outcome.reason === "price",
            ).length,
          },
        ),
      }))
      .sort(
        (a, b) =>
          Number(b.insight.hot) - Number(a.insight.hot) ||
          b.insight.score - a.insight.score,
      );
    const open = opportunities.filter(
      (item) =>
        !["won", "lost"].includes(item.deal.stage) &&
        item.deal.currency === currency,
    );
    const recentOutcomes = outcomes.filter(
      (outcome) =>
        new Date(outcome.created_at).getTime() >= from &&
        outcome.currency === currency,
    );
    const recentPayments = payments.filter(
      (payment) =>
        Number(payment.occurred_at) >= from &&
        Number(payment.occurred_at) <= now &&
        payment.currency === currency,
    );
    const verifiedReceipts = recentPayments.map((payment) => ({
      id: payment.id,
      dealId: payment.deal_id,
      name: payment.name || "Unknown contact",
      amountMinor: Number(payment.amount_minor),
      kind: payment.kind as "payment" | "refund",
      reference: payment.reference,
      occurredAt: Number(payment.occurred_at),
    }));
    const reversedMinor = verifiedReceipts
      .filter((receipt) => receipt.kind === "refund")
      .reduce((sum, receipt) => sum + receipt.amountMinor, 0);
    const won = recentOutcomes.filter((outcome) => outcome.outcome === "won"),
      lost = recentOutcomes.filter((outcome) => outcome.outcome === "lost");
    const net = (rows: any[]) =>
      rows.reduce(
        (sum, row) =>
          sum + (row.kind === "refund" ? -1 : 1) * Number(row.amount_minor),
        0,
      );
    const attribution = new Map<
      string,
      RevenueOverview["attribution"][number]
    >();
    for (const row of [
      ...recentPayments,
      ...won.map((outcome) => ({
        source: outcome.snapshot.source,
        campaign: outcome.snapshot.campaign,
        won: outcome,
      })),
    ] as any[]) {
      const key = JSON.stringify([row.source || "unknown", row.campaign || ""]);
      const group = attribution.get(key) || {
        source: row.source || "unknown",
        campaign: row.campaign || "",
        revenueMinor: 0,
        wonMinor: 0,
        wonDeals: 0,
      };
      if (row.won) {
        group.wonMinor += Number(row.won.value_minor || 0);
        group.wonDeals++;
      } else
        group.revenueMinor +=
          (row.kind === "refund" ? -1 : 1) * Number(row.amount_minor);
      attribution.set(key, group);
    }
    const reasons = new Map<
      string,
      { outcome: string; reason: string; count: number }
    >();
    for (const outcome of recentOutcomes) {
      const key = `${outcome.outcome}:${outcome.reason}`;
      const row = reasons.get(key) || {
        outcome: outcome.outcome,
        reason: outcome.reason,
        count: 0,
      };
      row.count++;
      reasons.set(key, row);
    }
    const learningReasons = new Map<string, number>();
    for (const outcome of industryOutcomes)
      if (outcome.outcome === "lost")
        learningReasons.set(
          outcome.reason,
          (learningReasons.get(outcome.reason) || 0) + 1,
        );
    const lessons: string[] = [];
    for (const [reason, count] of learningReasons)
      if (count >= 3)
        lessons.push(
          `${count} recorded losses cite ${reason}. Review the relevant playbook; this is an association, not causation.`,
        );
    if (helpful[0].n >= 3)
      lessons.push(
        `${helpful[0].n} replies were marked helpful by your team. Review them alongside deal outcomes before changing approved messaging.`,
      );
    return {
      currency,
      from: new Date(from).toISOString(),
      to: new Date(now).toISOString(),
      forecastTo: new Date(horizon).toISOString(),
      revenueMinor: net(recentPayments),
      reversedMinor,
      verifiedReceipts,
      wonMinor: won.reduce(
        (sum, outcome) => sum + Number(outcome.value_minor || 0),
        0,
      ),
      pipelineMinor: open.reduce(
        (sum, item) => sum + (item.insight.indicativeValueMinor || 0),
        0,
      ),
      forecastMinor: Math.round(
        open
          .filter(
            (item) =>
              item.deal.expectedClose &&
              new Date(item.deal.expectedClose + "T23:59:59Z").getTime() >=
                now &&
              new Date(item.deal.expectedClose + "T00:00:00Z").getTime() <=
                horizon,
          )
          .reduce(
            (sum, item) =>
              sum +
              (item.insight.indicativeValueMinor || 0) *
                item.insight.probability,
            0,
          ),
      ),
      unknownValueDeals: open.filter(
        (item) => item.insight.indicativeValueMinor === null,
      ).length,
      undatedDeals: open.filter((item) => !item.deal.expectedClose).length,
      conversionRate:
        won.length + lost.length
          ? won.length / (won.length + lost.length)
          : null,
      qualifiedLeads: open.filter(
        (item) => item.insight.qualified || item.deal.stage === "qualified",
      ).length,
      hotLeads: open.filter((item) => item.insight.hot).length,
      wonDeals: won.length,
      lostDeals: lost.length,
      opportunities: opportunities.filter(
        (item) => item.deal.currency === currency,
      ),
      reasons: [...reasons.values()].sort((a, b) => b.count - a.count),
      attribution: [...attribution.values()],
      learning: {
        samples: industryOutcomes.length,
        successfulReplies: helpful[0].n,
        byStage: cohorts,
        lessons,
      },
    };
  }
  /**
   * Open opportunities waiting on a person, most stale first. This is a human
   * worklist: it never sends a message and never claims a sale. Candidates are
   * open, not escalated, and without a customer reply for seven days.
   */
  async recovery(workspaceId: string): Promise<RecoveryList> {
    const now = Date.now();
    const rows = await this.db.query(
      `SELECT d.*,c.name,c.platform,c.created_at AS conversation_created_at,
        (SELECT max(m.timestamp) FROM messages m WHERE m.conversation_id=d.conversation_id AND m.workspace_id=d.workspace_id AND m.sender='contact') AS last_inbound,
        (SELECT a.action FROM audit_events a WHERE a.workspace_id=d.workspace_id AND a.resource_id=d.id AND a.action IN ('revenue.recovery_dismissed','revenue.recovery_restored') ORDER BY a.created_at DESC,a.id DESC LIMIT 1) AS recovery_action
       FROM deals d JOIN conversations c ON c.id=d.conversation_id AND c.workspace_id=d.workspace_id
       WHERE d.workspace_id=$1 AND d.stage NOT IN ('won','lost') AND d.escalated=false
       ORDER BY d.created_at`,
      [workspaceId],
    );
    const stale = rows
      .map((row) => ({
        row,
        daysStale: Math.floor(
          (
            now -
            Number(
              row.last_inbound ?? new Date(row.conversation_created_at).getTime(),
            )
          ) /
            86400000
        ),
      }))
      .filter((item) => item.daysStale >= 7)
      .sort(
        (first, second) =>
          second.daysStale - first.daysStale ||
          String(first.row.name).localeCompare(String(second.row.name)),
      );
    const limit = 25;
    const active = stale
      .filter((item) => item.row.recovery_action !== "revenue.recovery_dismissed")
      .slice(0, limit);
    const dismissed = stale
      .filter((item) => item.row.recovery_action === "revenue.recovery_dismissed")
      .slice(0, limit);
    const build = async (item: { row: any; daysStale: number }) => {
      const insight = await this.intelligence(workspaceId, item.row);
      const entry: RecoveryEntry = {
        dealId: item.row.id,
        conversationId: item.row.conversation_id,
        name: item.row.name,
        platform: item.row.platform,
        stage: item.row.stage,
        daysStale: item.daysStale,
        reason:
          insight.risks.find((risk) => risk.includes("seven days")) ??
          insight.risks[0] ??
          "No customer response in seven days.",
        nextAction: insight.nextAction,
        valueMinor: insight.indicativeValueMinor,
        currency: item.row.currency,
        insight,
      };
      return entry;
    };
    const entries = await Promise.all(active.map((item) => build(item)));
    const dismissedEntries = await Promise.all(dismissed.map((item) => build(item)));
    return {
      entries,
      dismissed: dismissedEntries,
      notice:
        "Open opportunities waiting on a person. Nothing here is sent automatically; open the conversation to reply.",
    };
  }
  async dismissRecovery(actor: Actor, dealId: string, reason: string) {
    const deal = await this.getDeal(actor.workspaceId, dealId);
    await this.event(
      actor.workspaceId,
      actor.userId,
      "revenue.recovery_dismissed",
      deal.id,
      { reason },
    );
    this.changed(actor.workspaceId);
    return { ok: true };
  }
  async restoreRecovery(actor: Actor, dealId: string) {
    const deal = await this.getDeal(actor.workspaceId, dealId);
    await this.event(
      actor.workspaceId,
      actor.userId,
      "revenue.recovery_restored",
      deal.id,
      {},
    );
    this.changed(actor.workspaceId);
    return { ok: true };
  }
  async quote(
    actor: Actor,
    id: string,
    input: {
      lines: { entryId: string; quantity: number }[];
      validDays: number;
    },
    key: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const deal = await this.getDeal(actor.workspaceId, id, tx, true);
      if (["won", "lost"].includes(deal.stage))
        throw new HttpError(
          409,
          "Closed opportunities cannot receive new quotes.",
        );
      const [existing] = await tx.query(
        "SELECT * FROM deal_quotes WHERE workspace_id=$1 AND client_key=$2",
        [actor.workspaceId, key],
      );
      if (existing) {
        const normalized = existing.lines.map((line: any) => ({
          entryId: line.entryId,
          quantity: line.quantity,
        }));
        if (
          existing.deal_id !== id ||
          existing.valid_days !== input.validDays ||
          JSON.stringify(normalized) !== JSON.stringify(input.lines)
        )
          throw new HttpError(409, "Quote key was used for different content.");
        return existing;
      }
      const lines: DealQuote["lines"] = [];
      let total = 0;
      for (const line of input.lines) {
        const [entry] = await tx.query(
          "SELECT * FROM brain_entries WHERE id=$1 AND workspace_id=$2 FOR SHARE",
          [line.entryId, actor.workspaceId],
        );
        if (
          !entry ||
          !entry.approved ||
          !["product", "service"].includes(entry.kind) ||
          entry.price_minor === null ||
          (entry.expires_at && Number(entry.expires_at) <= Date.now())
        )
          throw new HttpError(
            409,
            "Quotes require current, approved product or service prices.",
          );
        if (entry.currency !== deal.currency)
          throw new HttpError(
            409,
            "Quote and opportunity currencies must match.",
          );
        const minor = Number(entry.price_minor);
        total += minor * line.quantity;
        lines.push({
          entryId: entry.id,
          title: entry.title,
          quantity: line.quantity,
          unitMinor: minor,
          version: entry.version,
        });
      }
      if (!Number.isSafeInteger(total) || total > 100000000000)
        throw new HttpError(400, "Quote total is too large.");
      const expiresAt = Date.now() + input.validDays * 86400000;
      const text = `Quote\n${lines.map((line) => `${line.title} x${line.quantity}: ${money(line.unitMinor * line.quantity, deal.currency)}`).join("\n")}\nTotal: ${money(total, deal.currency)}\nValid until ${new Date(expiresAt).toISOString().slice(0, 10)}. Prepared for review; taxes and additional fees must be confirmed before sending.`;
      const [quote] = await tx.query(
        "INSERT INTO deal_quotes(id,workspace_id,deal_id,lines,total_minor,currency,expires_at,client_key,text,valid_days) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        [
          randomUUID(),
          actor.workspaceId,
          id,
          JSON.stringify(lines),
          total,
          deal.currency,
          expiresAt,
          key,
          text,
          input.validDays,
        ],
      );
      if ((await this.profile(actor.workspaceId, tx)).autoStage)
        await tx.query(
          "UPDATE deals SET stage='proposed',value_minor=COALESCE(value_minor,$1),version=version+1,updated_at=now() WHERE id=$2 AND workspace_id=$3 AND stage IN ('new','qualified')",
          [total, id, actor.workspaceId],
        );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "quote.prepared",
        quote.id,
        { totalMinor: total, currency: deal.currency },
        tx,
      );
      return quote;
    });
    this.changed(actor.workspaceId);
    return quoteView(result);
  }
  async appointment(
    actor: Actor,
    id: string,
    input: { title: string; startAt: number; endAt: number; resource: string },
    key: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      await tx.query("SELECT id FROM workspaces WHERE id=$1 FOR UPDATE", [
        actor.workspaceId,
      ]);
      const deal = await this.getDeal(actor.workspaceId, id, tx);
      if (deal.stage === "lost")
        throw new HttpError(409, "A lost deal cannot be booked.");
      const [existing] = await tx.query(
        "SELECT * FROM appointments WHERE workspace_id=$1 AND client_key=$2",
        [actor.workspaceId, key],
      );
      if (existing) {
        if (
          existing.deal_id !== id ||
          Number(existing.start_at) !== input.startAt ||
          Number(existing.end_at) !== input.endAt ||
          existing.resource !== input.resource ||
          existing.title !== input.title
        )
          throw new HttpError(
            409,
            "Booking key was used for different details.",
          );
        return existing;
      }
      const [conflict] = await tx.query(
        "SELECT id FROM appointments WHERE workspace_id=$1 AND lower(resource)=lower($2) AND status='confirmed' AND start_at<$3 AND end_at>$4",
        [actor.workspaceId, input.resource, input.endAt, input.startAt],
      );
      if (conflict)
        throw new HttpError(
          409,
          "This resource already has an overlapping appointment. Choose another time.",
        );
      const [row] = await tx.query(
        "INSERT INTO appointments(id,workspace_id,deal_id,title,start_at,end_at,resource,client_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [
          randomUUID(),
          actor.workspaceId,
          id,
          input.title,
          input.startAt,
          input.endAt,
          input.resource,
          key,
        ],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "appointment.recorded",
        row.id,
        { externalCalendar: false },
        tx,
      );
      return row;
    });
    this.changed(actor.workspaceId);
    return appointmentView(result);
  }
  async followUp(
    actor: Actor,
    id: string,
    input: { dueAt: number; text: string },
    key: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const deal = await this.getDeal(actor.workspaceId, id, tx, true);
      if (["won", "lost"].includes(deal.stage) || deal.escalated)
        throw new HttpError(409, "Follow-up is paused for this opportunity.");
      const [existing] = await tx.query(
        "SELECT * FROM sales_tasks WHERE workspace_id=$1 AND client_key=$2",
        [actor.workspaceId, key],
      );
      if (existing) {
        if (
          existing.deal_id !== id ||
          Number(existing.due_at) !== input.dueAt ||
          existing.text !== input.text
        )
          throw new HttpError(409, "Task key was used for different details.");
        return existing;
      }
      const [last] = await tx.query(
        "SELECT id FROM messages WHERE workspace_id=$1 AND conversation_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 1",
        [actor.workspaceId, deal.conversation_id],
      );
      const taskId = randomUUID();
      const [task] = await tx.query(
        "INSERT INTO sales_tasks(id,workspace_id,deal_id,kind,due_at,text,anchor_id,client_key) VALUES($1,$2,$3,'follow_up',$4,$5,$6,$7) RETURNING *",
        [
          taskId,
          actor.workspaceId,
          id,
          input.dueAt,
          input.text,
          last?.id || null,
          key,
        ],
      );
      await tx.query(
        "INSERT INTO jobs(id,workspace_id,kind,payload,available_at) VALUES($1,$2,'sales-task',$3,$4)",
        [
          `sales:${taskId}`,
          actor.workspaceId,
          JSON.stringify({ taskId }),
          input.dueAt,
        ],
      );
      await this.event(
        actor.workspaceId,
        actor.userId,
        "follow_up.scheduled",
        taskId,
        {},
        tx,
      );
      return task;
    });
    this.changed(actor.workspaceId);
    return taskView(result);
  }
  async processTask(workspaceId: string, taskId: string) {
    const [task] = await this.db.query(
      "SELECT t.*,d.conversation_id,d.stage,d.escalated FROM sales_tasks t JOIN deals d ON d.id=t.deal_id AND d.workspace_id=t.workspace_id WHERE t.id=$1 AND t.workspace_id=$2",
      [taskId, workspaceId],
    );
    if (
      !task ||
      task.status !== "scheduled" ||
      Number(task.due_at) > Date.now()
    )
      return;
    const [last] = await this.db.query(
      "SELECT id FROM messages WHERE workspace_id=$1 AND conversation_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 1",
      [workspaceId, task.conversation_id],
    );
    const stopped =
      task.escalated ||
      ["won", "lost"].includes(task.stage) ||
      last?.id !== task.anchor_id;
    await this.db.query(
      "UPDATE sales_tasks SET status=$1,reason=$2 WHERE id=$3 AND workspace_id=$4",
      [
        stopped ? "cancelled" : "ready",
        stopped
          ? "Conversation changed or opportunity paused."
          : "Ready for human review; provider window still applies.",
        taskId,
        workspaceId,
      ],
    );
    this.changed(workspaceId);
  }
  async escalate(
    actor: Actor,
    id: string,
    input: { enabled: boolean; reason: string },
  ) {
    await this.db.transaction(async (tx) => {
      const deal = await this.getDeal(actor.workspaceId, id, tx, true);
      await tx.query(
        "UPDATE deals SET escalated=$1,escalation_reason=$2,version=version+1,updated_at=now() WHERE id=$3 AND workspace_id=$4",
        [input.enabled, input.reason, id, actor.workspaceId],
      );
      if (input.enabled) {
        await tx.query(
          "UPDATE conversations SET auto_send=false,hold_until=$1 WHERE id=$2 AND workspace_id=$3",
          [Date.now() + 86400000, deal.conversation_id, actor.workspaceId],
        );
        await tx.query(
          "UPDATE sales_tasks SET status='cancelled',reason='Human escalation.' WHERE workspace_id=$1 AND deal_id=$2 AND status='scheduled'",
          [actor.workspaceId, id],
        );
      } else {
        await tx.query(
          "UPDATE conversations SET hold_until=0,auto_send=false WHERE id=$1 AND workspace_id=$2",
          [deal.conversation_id, actor.workspaceId],
        );
      }
      await this.event(
        actor.workspaceId,
        actor.userId,
        input.enabled ? "deal.escalated" : "deal.escalation_resolved",
        id,
        {},
        tx,
      );
    });
    this.changed(actor.workspaceId);
  }
  async context(workspaceId: string) {
    const brain = await this.brain(workspaceId);
    const active = brain.entries.filter(
      (entry) =>
        entry.approved && (!entry.expiresAt || entry.expiresAt > Date.now()),
    );
    const activeIds = new Set(active.map((entry) => entry.id));
    const links = brain.links.filter(
      (link) => activeIds.has(link.fromId) && activeIds.has(link.toId),
    );
    const facts = active
      .filter((entry) =>
        ["product", "service", "faq", "offer"].includes(entry.kind),
      )
      .map(
        (entry) =>
          `[${entry.kind}] ${entry.title}: ${entry.content}${entry.priceMinor !== null ? ` Approved price: ${money(entry.priceMinor, entry.currency)}.` : ""}`,
      )
      .join("\n")
      .slice(0, 12000);
    const entryGuidance = active
      .filter((entry) =>
        ["playbook", "voice", "competitor"].includes(entry.kind),
      )
      .map((entry) => `${entry.kind}: ${entry.title}: ${entry.content}`)
      .join("\n")
      .slice(0, 4000);
    // ⚡ Bolt Optimization: Index active entries by ID (O(N)) to avoid O(N*M) lookups when building link guidance
    const activeMap = new Map(active.map((entry) => [entry.id, entry.title]));
    const guidance =
      `${entryGuidance}\nKnowledge relationships:\n${links.map((link) => `${activeMap.get(link.fromId)} ${link.relation} ${activeMap.get(link.toId)}`).join("\n")}`.slice(
        0,
        5000,
      );
    return {
      profile: brain.profile,
      facts,
      guidance,
      boundary: industryGuidance[brain.profile.industry].boundary,
      fingerprint: digest(
        JSON.stringify({
          profile: brain.profile,
          entries: active.map((entry) => [
            entry.id,
            entry.version,
            entry.expiresAt,
          ]),
          links: links.map((link) => [link.fromId, link.toId, link.relation]),
        }),
      ),
    };
  }
  async export(workspaceId: string) {
    const tables = [
      "business_profiles",
      "brain_entries",
      "brain_links",
      "deals",
      "deal_events",
      "deal_outcomes",
      "revenue_events",
      "revenue_voids",
      "deal_quotes",
      "appointments",
      "sales_tasks",
      "reply_feedback",
    ];
    const rows = await Promise.all(
      tables.map((table) =>
        this.db.query(`SELECT * FROM ${table} WHERE workspace_id=$1`, [
          workspaceId,
        ]),
      ),
    );
    return Object.fromEntries(
      tables.map((table, index) => [table, rows[index]]),
    );
  }
}
