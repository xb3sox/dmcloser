import type { ProductService } from "./service.ts";
import type { Billing } from "./billing.ts";
import { normalizeWebhook } from "./providers.ts";
import { decrypt, encrypt, HttpError } from "./security.ts";

export class Worker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastTick = 0;
  constructor(
    public service: ProductService,
    private billing: Billing,
  ) {}
  async once(): Promise<boolean> {
    const job: any = await this.service.db.transaction(async (tx) => {
      const [row] = await tx.query(
        "SELECT * FROM jobs WHERE (state='pending' AND available_at<=$1) OR (state='processing' AND lease_until<$1) ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED",
        [Date.now()],
      );
      if (!row) return null;
      await tx.query(
        "UPDATE jobs SET state='processing',attempts=attempts+1,lease_until=$1,updated_at=now() WHERE id=$2",
        [Date.now() + 60000, row.id],
      );
      return { ...row, attempts: row.attempts + 1 };
    });
    if (!job) return false;
    try {
      const payload = job.payload;
      if (job.kind === "webhook") {
        const [receipt] = await this.service.db.query(
          "SELECT * FROM webhook_receipts WHERE id=$1",
          [payload.receiptId],
        );
        if (receipt) {
          const normalized = normalizeWebhook(
            receipt.platform,
            receipt.payload,
          );
          for (const message of normalized.messages)
            await this.service.ingest(message);
          for (const status of normalized.statuses)
            await this.service.delivery(status);
        }
      } else if (job.kind === "sales-task")
        await this.service.revenue.processTask(
          job.workspace_id,
          job.payload.taskId,
        );
      else if (job.kind === "generate")
        await this.service.generate(
          job.workspace_id,
          payload.conversationId,
          payload.sourceId,
        );
      else if (job.kind === "deliver")
        await this.service.deliver(job.workspace_id, payload.messageId);
      else if (job.kind === "auto-send") {
        const [suggestion] = await this.service.db.query(
          "SELECT * FROM suggestions WHERE workspace_id=$1 AND source_id=$2 AND status='ready'",
          [job.workspace_id, payload.sourceId],
        );
        if (suggestion) {
          try {
            await this.service.queueMessage(
              job.workspace_id,
              null,
              payload.conversationId,
              suggestion.text,
              `auto:${payload.sourceId}`,
              payload.sourceId,
              true,
            );
          } catch (error) {
            if (
              !(error instanceof HttpError && [404, 409].includes(error.status))
            )
              throw error;
          }
        }
      } else if (job.kind === "ai-eval")
        await this.service.quality.runVersion(job.workspace_id, payload.versionId);
      else if (job.kind === "billing")
        await this.billing.process(payload.event);
      else if (job.kind === "refresh-token") {
        const [connection] = await this.service.db.query(
          "SELECT * FROM connections WHERE id=$1 AND platform='instagram' AND status='connected'",
          [payload.connectionId],
        );
        if (connection) {
          const value = await this.service.meta.refreshInstagram(
            decrypt(connection.token_cipher, this.service.config.encryptionKey),
          );
          await this.service.db.query(
            "UPDATE connections SET token_cipher=$1,expires_at=$2,updated_at=now() WHERE id=$3",
            [
              encrypt(value.token, this.service.config.encryptionKey),
              value.expiresAt,
              connection.id,
            ],
          );
        }
      }
      if (job.kind === "webhook")
        await this.service.db.query(
          "UPDATE webhook_receipts SET payload='{}'::jsonb WHERE id=$1",
          [job.payload.receiptId],
        );
      if (job.kind === "billing")
        await this.service.db.query(
          "UPDATE webhook_receipts SET payload='{}'::jsonb WHERE id=$1",
          [job.payload.event.id],
        );
      await this.service.db.query(
        "UPDATE jobs SET state='done',payload='{}'::jsonb,error=NULL,lease_until=0,updated_at=now() WHERE id=$1",
        [job.id],
      );
    } catch (error) {
      const missingAI =
        error instanceof Error && error.message === "AI_NOT_CONFIGURED";
      const permanent =
        missingAI || (error instanceof HttpError && error.status < 500);
      const dead = permanent || job.attempts >= 3;
      const reason = missingAI
        ? "AI is not configured. Add OPENAI_API_KEY on the server; you can reply manually."
        : error instanceof HttpError
          ? error.message
          : job.kind === "generate"
            ? "AI reply unavailable. Write a reply or try generation again."
            : "Background action failed. Review the activity log before retrying.";
      await this.service.db.query(
        "UPDATE jobs SET state=$1,error=$2,available_at=$3,lease_until=0,updated_at=now() WHERE id=$4",
        [
          dead ? "dead" : "pending",
          reason,
          Date.now() + Math.min(60000, 2000 * 2 ** job.attempts),
          job.id,
        ],
      );
      if (job.kind === "generate") {
        this.service.metrics.aiFailures++;
        await this.service.db.query(
          "UPDATE conversations SET ai_error=$1 WHERE id=$2 AND workspace_id=$3",
          [reason, job.payload.conversationId, job.workspace_id],
        );
      }
      if (dead && job.kind === "deliver")
        await this.service.failMessage(
          job.workspace_id,
          job.payload.messageId,
          "Delivery retries exhausted. Review the provider inbox before retrying.",
        );
      if (dead && job.kind === "refresh-token")
        await this.service.db.query(
          "UPDATE connections SET status='reconnect',error='Token refresh failed. Reconnect this account before sending.' WHERE id=$1",
          [job.payload.connectionId],
        );
      if (job.workspace_id)
        await this.service.audit(
          job.workspace_id,
          null,
          dead ? "job.needs_review" : "job.retry_scheduled",
          job.id,
          { kind: job.kind, attempts: job.attempts },
        );
      console.error(
        JSON.stringify({
          event: "job.failure",
          id: job.id,
          kind: job.kind,
          dead,
          attempts: job.attempts,
        }),
      );
    } finally {
      if (job.workspace_id) this.service.changed(job.workspace_id);
    }
    return true;
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.lastTick = Date.now();
      if (this.running) return;
      this.running = true;
      this.once()
        .catch(() =>
          console.error(JSON.stringify({ event: "worker.unavailable" })),
        )
        .finally(() => {
          this.running = false;
        });
    }, 150);
    this.timer.unref();
  }
  /** True while the poll loop is alive; background work stops without it. */
  healthy() {
    // The heartbeat must tolerate a long, legitimate job: the poll loop runs
    // every 150ms but one generation/maintenance pass can take a few seconds,
    // so 15 seconds risked a false "degraded" during heavy maintenance.
    return this.lastTick > 0 && (this.running || Date.now() - this.lastTick < 30000);
  }
  async maintenance() {
    await this.service.db.query("DELETE FROM sessions WHERE expires_at<$1", [
      Date.now(),
    ]);
    await this.service.db.query("DELETE FROM tokens WHERE expires_at<$1", [
      Date.now(),
    ]);
    await this.service.db.query(
      "DELETE FROM jobs WHERE state='done' AND updated_at<now()-interval '7 days'",
    );
    await this.service.db.query(
      "DELETE FROM webhook_receipts WHERE created_at<now()-interval '7 days' AND NOT EXISTS (SELECT 1 FROM jobs WHERE state IN ('pending','processing') AND payload->>'receiptId'=webhook_receipts.id)",
    );
    const connections = await this.service.db.query(
      "SELECT id,workspace_id,expires_at FROM connections WHERE platform='instagram' AND status='connected' AND expires_at<$1",
      [Date.now() + 7 * 86400000],
    );
    for (const connection of connections)
      await this.service.enqueue(
        "refresh-token",
        { connectionId: connection.id },
        connection.workspace_id,
        `refresh:${connection.id}:${new Date().toISOString().slice(0, 10)}`,
      );
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    while (this.running)
      await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
