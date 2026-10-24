import type { Express, RequestHandler } from "express";
import { z } from "zod";
import type { ProductService } from "./service.ts";
import { HttpError } from "./security.ts";

const currency = z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]);
const minor = z.number().int().min(0).max(100000000000);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (date) =>
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date,
    "Choose a real calendar date.",
  );
const entry = z
  .object({
    kind: z.enum([
      "product",
      "service",
      "faq",
      "offer",
      "competitor",
      "playbook",
      "voice",
    ]),
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(3000),
    priceMinor: minor.nullable(),
    currency,
    approved: z.boolean(),
    expiresAt: z.number().int().positive().nullable(),
  })
  .strict();
const sectorField = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9_]+$/),
    label: z.string().trim().min(1).max(80),
    type: z.enum(["text", "number", "date"]),
    required: z.boolean(),
  })
  .strict();
const qualification = z
  .object({
    budgetMinor: minor.nullable(),
    authority: z.enum(["unknown", "decision_maker", "influencer"]),
    need: z.string().trim().max(500),
    timelineDate: isoDate.nullable(),
    custom: z.record(z.string().max(40), z.string().max(500)).optional(),
  })
  .strict();
const id = (value: unknown) => z.string().min(1).max(150).parse(value);
const key = (value: unknown) => z.string().min(16).max(128).parse(value);

export function mountRevenueRoutes(
  app: Express,
  service: ProductService,
  owner: RequestHandler,
) {
  const revenue = service.revenue,
    db = service.db;
  app.get("/api/brain", async (req, res) =>
    res.json(await revenue.brain(req.actor!.workspaceId)),
  );
  app.patch("/api/brain/profile", owner, async (req, res) =>
    res.json(
      await revenue.updateProfile(
        req.actor!,
        z
          .object({
            industry: z.enum([
              "general",
              "real_estate",
              "medical",
              "automotive",
              "beauty",
              "ecommerce",
              "custom",
            ]),
            currency,
            autoStage: z.boolean(),
            sectorFields: z.array(sectorField).max(20).default([]),
          })
          .strict()
          .parse(req.body),
      ),
    ),
  );
  app.post("/api/brain/entries", owner, async (req, res) =>
    res
      .status(201)
      .json(await revenue.saveEntry(req.actor!, null, entry.parse(req.body))),
  );
  app.patch("/api/brain/entries/:id", owner, async (req, res) =>
    res.json(
      await revenue.saveEntry(
        req.actor!,
        id(req.params.id),
        entry.extend({ version: z.number().int().positive() }).parse(req.body),
      ),
    ),
  );
  app.delete("/api/brain/entries/:id", owner, async (req, res) => {
    await revenue.deleteEntry(req.actor!, id(req.params.id));
    res.json({ ok: true });
  });
  app.post("/api/brain/links", owner, async (req, res) =>
    res.status(201).json(
      await revenue.link(
        req.actor!,
        z
          .object({
            fromId: z.string().min(1).max(150),
            toId: z.string().min(1).max(150),
            relation: z.enum([
              "answers",
              "supports",
              "competes_with",
              "bundles",
            ]),
          })
          .strict()
          .refine(
            (body) => body.fromId !== body.toId,
            "Choose two different entries.",
          )
          .parse(req.body),
      ),
    ),
  );
  app.delete("/api/brain/links/:id", owner, async (req, res) => {
    const rows = await db.query(
      "DELETE FROM brain_links WHERE id=$1 AND workspace_id=$2 RETURNING id",
      [id(req.params.id), req.actor!.workspaceId],
    );
    if (!rows.length) throw new HttpError(404, "Relationship not found.");
    await revenue.event(
      req.actor!.workspaceId,
      req.actor!.userId,
      "brain.relationship_deleted",
      rows[0].id,
    );
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.get("/api/revenue", async (req, res) =>
    res.json(
      await revenue.overview(
        req.actor!.workspaceId,
        currency.parse(
          req.query.currency ||
            (await revenue.profile(req.actor!.workspaceId)).currency,
        ),
      ),
    ),
  );
  app.get("/api/conversations/:id/deal", async (req, res) =>
    res.json(await revenue.detail(req.actor!.workspaceId, id(req.params.id))),
  );
  app.get("/api/revenue/recovery", async (req, res) =>
    res.json(await revenue.recovery(req.actor!.workspaceId)),
  );
  app.post("/api/revenue/recovery/:dealId/dismiss", async (req, res) => {
    const body = z
      .object({ reason: z.string().trim().min(3).max(300) })
      .strict()
      .parse(req.body);
    await revenue.dismissRecovery(
      req.actor!,
      id(req.params.dealId),
      body.reason,
    );
    res.json({ ok: true });
  });
  app.post("/api/revenue/recovery/:dealId/restore", async (req, res) => {
    await revenue.restoreRecovery(req.actor!, id(req.params.dealId));
    res.json({ ok: true });
  });
  app.patch("/api/deals/:id", async (req, res) =>
    res.json(
      await revenue.updateDeal(
        req.actor!,
        id(req.params.id),
        z
          .object({
            version: z.number().int().positive(),
            stage: z
              .enum(["new", "qualified", "proposed", "negotiation"])
              .optional(),
            valueMinor: minor.nullable().optional(),
            currency: currency.optional(),
            expectedClose: isoDate.nullable().optional(),
            productId: z.string().max(150).nullable().optional(),
            qualification: qualification.optional(),
            campaign: z.string().trim().max(120).optional(),
          })
          .strict()
          .parse(req.body),
      ),
    ),
  );
  app.post("/api/deals/:id/outcome", async (req, res) => {
    await revenue.close(
      req.actor!,
      id(req.params.id),
      z
        .object({
          version: z.number().int().positive(),
          outcome: z.enum(["won", "lost"]),
          reason: z.enum([
            "fit",
            "price",
            "timing",
            "trust",
            "competition",
            "service",
            "no_response",
            "other",
          ]),
          note: z.string().trim().max(1000).default(""),
        })
        .strict()
        .parse(req.body),
    );
    res.json({ ok: true });
  });
  app.post("/api/deals/:id/revenue", owner, async (req, res) => {
    const body = z
      .object({
        kind: z.enum(["payment", "refund"]),
        amountMinor: minor.refine(
          (value) => value > 0,
          "Enter a positive amount.",
        ),
        reference: z.string().trim().min(3).max(120),
        occurredAt: z
          .number()
          .int()
          .min(Date.UTC(2020, 0, 1))
          .max(Date.now() + 60000),
        confirmed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    res
      .status(201)
      .json(
        await revenue.payment(
          req.actor!,
          id(req.params.id),
          body,
          key(req.get("idempotency-key")),
        ),
      );
  });
  app.post("/api/deals/:id/quotes", async (req, res) =>
    res.status(201).json(
      await revenue.quote(
        req.actor!,
        id(req.params.id),
        z
          .object({
            lines: z
              .array(
                z
                  .object({
                    entryId: z.string().min(1).max(150),
                    quantity: z.number().int().min(1).max(1000),
                  })
                  .strict(),
              )
              .min(1)
              .max(10),
            validDays: z.number().int().min(1).max(30),
          })
          .strict()
          .parse(req.body),
        key(req.get("idempotency-key")),
      ),
    ),
  );
  app.patch("/api/quotes/:id", async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["accepted", "rejected"]) })
      .strict()
      .parse(req.body);
    await db.transaction(async (tx) => {
      const [quote] = await tx.query(
        "SELECT * FROM deal_quotes WHERE id=$1 AND workspace_id=$2 FOR UPDATE",
        [id(req.params.id), req.actor!.workspaceId],
      );
      if (!quote) throw new HttpError(404, "Quote not found.");
      if (quote.status !== "draft" || Number(quote.expires_at) < Date.now())
        throw new HttpError(
          409,
          "Quote has expired or already has an outcome.",
        );
      await tx.query(
        "UPDATE deal_quotes SET status=$1 WHERE id=$2 AND workspace_id=$3",
        [status, quote.id, req.actor!.workspaceId],
      );
      await revenue.event(
        req.actor!.workspaceId,
        req.actor!.userId,
        `quote.${status}`,
        quote.id,
        {},
        tx,
      );
    });
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.post("/api/deals/:id/appointments", async (req, res) => {
    const body = z
      .object({
        title: z.string().trim().min(1).max(120),
        resource: z.string().trim().min(1).max(80),
        startAt: z
          .number()
          .int()
          .min(Date.now() + 60000)
          .max(Date.now() + 366 * 86400000),
        endAt: z.number().int(),
      })
      .strict()
      .refine(
        (body) =>
          body.endAt - body.startAt >= 60000 &&
          body.endAt - body.startAt <= 8 * 3600000,
        "Appointments must last between one minute and eight hours.",
      )
      .parse(req.body);
    res
      .status(201)
      .json(
        await revenue.appointment(
          req.actor!,
          id(req.params.id),
          body,
          key(req.get("idempotency-key")),
        ),
      );
  });
  app.patch("/api/appointments/:id", async (req, res) => {
    z.object({ status: z.literal("cancelled") })
      .strict()
      .parse(req.body);
    const rows = await db.query(
      "UPDATE appointments SET status='cancelled' WHERE id=$1 AND workspace_id=$2 RETURNING id",
      [id(req.params.id), req.actor!.workspaceId],
    );
    if (!rows.length) throw new HttpError(404, "Appointment not found.");
    await revenue.event(
      req.actor!.workspaceId,
      req.actor!.userId,
      "appointment.cancelled",
      rows[0].id,
    );
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.get("/api/appointments/:id/calendar", async (req, res) => {
    const [appointment] = await db.query(
      "SELECT * FROM appointments WHERE id=$1 AND workspace_id=$2",
      [id(req.params.id), req.actor!.workspaceId],
    );
    if (!appointment) throw new HttpError(404, "Appointment not found.");
    const stamp = (value: number) =>
      new Date(value)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const clean = (text: unknown) => String(text ?? "").replace(/[\r\n]/g, "");
    const escape = (value: unknown) =>
      String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\r\n|\r|\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    res.json({
      filename: "dmcloser-appointment.ics",
      content: [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DMCloser//Internal Appointments//EN",
        "BEGIN:VEVENT",
        `UID:${clean(appointment.id)}@dmcloser`,
        `DTSTAMP:${stamp(Date.now())}`,
        `DTSTART:${stamp(Number(appointment.start_at))}`,
        `DTEND:${stamp(Number(appointment.end_at))}`,
        `SUMMARY:${escape(appointment.title)}`,
        `DESCRIPTION:${escape("Internal booking; confirm the customer and external calendar separately.")}`,
        `STATUS:${clean(appointment.status) === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ]
        .map((line) => {
          const parts: string[] = [];
          let current = "";
          for (const character of line) {
            if (Buffer.byteLength(current + character, "utf8") > 74) {
              parts.push(current);
              current = " " + character;
            } else current += character;
          }
          parts.push(current);
          return parts.join("\r\n");
        })
        .join("\r\n"),
    });
  });
  app.post("/api/deals/:id/follow-ups", async (req, res) =>
    res.status(201).json(
      await revenue.followUp(
        req.actor!,
        id(req.params.id),
        z
          .object({
            dueAt: z
              .number()
              .int()
              .min(Date.now())
              .max(Date.now() + 90 * 86400000),
            text: z.string().trim().min(1).max(1000),
          })
          .strict()
          .parse(req.body),
        key(req.get("idempotency-key")),
      ),
    ),
  );
  app.patch("/api/sales-tasks/:id", async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["done", "cancelled"]) })
      .strict()
      .parse(req.body);
    const rows = await db.query(
      "UPDATE sales_tasks SET status=$1 WHERE id=$2 AND workspace_id=$3 RETURNING id",
      [status, id(req.params.id), req.actor!.workspaceId],
    );
    if (!rows.length) throw new HttpError(404, "Task not found.");
    await revenue.event(
      req.actor!.workspaceId,
      req.actor!.userId,
      `sales_task.${status}`,
      rows[0].id,
    );
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.post("/api/sales-tasks/:id/use", async (req, res) => {
    await db.transaction(async (tx) => {
      const [task] = await tx.query(
        "SELECT t.*,d.conversation_id,d.escalated,d.stage FROM sales_tasks t JOIN deals d ON d.id=t.deal_id AND d.workspace_id=t.workspace_id WHERE t.id=$1 AND t.workspace_id=$2 AND t.kind='follow_up' FOR UPDATE OF t",
        [id(req.params.id), req.actor!.workspaceId],
      );
      if (!task || task.status !== "ready")
        throw new HttpError(409, "This follow-up is not ready.");
      if (task.escalated || ["won", "lost"].includes(task.stage))
        throw new HttpError(409, "This opportunity is paused.");
      const [last] = await tx.query(
        "SELECT id FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 1",
        [task.conversation_id, req.actor!.workspaceId],
      );
      if (last?.id !== task.anchor_id)
        throw new HttpError(
          409,
          "Conversation changed. Review the latest message first.",
        );
      const [draft] = await tx.query(
        "SELECT text FROM drafts WHERE conversation_id=$1 AND user_id=$2",
        [task.conversation_id, req.actor!.userId],
      );
      if (draft?.text.trim())
        throw new HttpError(
          409,
          "Your existing draft was kept. Finish or clear it first.",
        );
      const saved = await tx.query(
        "INSERT INTO drafts(workspace_id,conversation_id,user_id,text) VALUES($1,$2,$3,$4) ON CONFLICT(conversation_id,user_id) DO UPDATE SET text=EXCLUDED.text,updated_at=now() WHERE trim(drafts.text)='' RETURNING conversation_id",
        [
          req.actor!.workspaceId,
          task.conversation_id,
          req.actor!.userId,
          task.text,
        ],
      );
      if (!saved.length)
        throw new HttpError(
          409,
          "Your existing draft was kept. Finish or clear it first.",
        );
      await tx.query(
        "UPDATE sales_tasks SET status='done' WHERE id=$1 AND workspace_id=$2",
        [task.id, req.actor!.workspaceId],
      );
    });
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.post("/api/deals/:id/escalation", async (req, res) => {
    await revenue.escalate(
      req.actor!,
      id(req.params.id),
      z
        .object({
          enabled: z.boolean(),
          reason: z.string().trim().min(3).max(300),
        })
        .strict()
        .parse(req.body),
    );
    res.json({ ok: true });
  });
  app.post("/api/messages/:id/feedback", async (req, res) => {
    const { label } = z
      .object({ label: z.enum(["helpful", "unhelpful"]) })
      .strict()
      .parse(req.body);
    const [message] = await db.query(
      "SELECT id FROM messages WHERE id=$1 AND workspace_id=$2 AND sender<>'contact' AND status IN ('sent','delivered','read')",
      [id(req.params.id), req.actor!.workspaceId],
    );
    if (!message)
      throw new HttpError(
        404,
        "A provider-accepted outgoing reply is required.",
      );
    await db.query(
      "INSERT INTO reply_feedback(workspace_id,message_id,label,actor_id) VALUES($1,$2,$3,$4) ON CONFLICT(workspace_id,message_id) DO UPDATE SET label=EXCLUDED.label,actor_id=EXCLUDED.actor_id,updated_at=now()",
      [req.actor!.workspaceId, message.id, label, req.actor!.userId],
    );
    await revenue.event(
      req.actor!.workspaceId,
      req.actor!.userId,
      "reply.feedback",
      message.id,
      { label },
    );
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
}
