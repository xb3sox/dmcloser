import type { ProductService } from "./service.ts";
import type { Billing } from "./billing.ts";
import * as Sentry from "@sentry/node";
import { normalizeWebhook } from "./providers.ts";
import { decrypt, encrypt, HttpError } from "./security.ts";
import {
  createMailer,
  isTransientMailError,
  sendEmail,
  type Mailer,
  type MailMessage,
} from "./mail.ts";
import { withTraceId } from "./trace.ts";

/** Default lease a processing job holds before another worker may reclaim it. */
const BASE_LEASE_MS = 60000;
const LONG_LEASE_MS = 4 * 60000;
/** Upper bound, so a wedged handler is still recoverable by another worker. */
const MAX_LEASE_MS = 15 * 60000;

export interface WorkerOptions {
  /**
   * Job kinds this worker is allowed to touch. Empty means every kind.
   * Two workers sharing one database never take the same row — the claim uses
   * FOR UPDATE SKIP LOCKED — but kind isolation keeps the web process off slow
   * AI work when a dedicated worker is deployed.
   */
  kinds?: string[];
  /** Upper bound on jobs processed at the same time by this instance. */
  concurrency?: number;
}

export class Worker {
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Jobs claimed and not yet finished on this instance. */
  private inFlight = 0;
  private lastTick = 0;
  private stopping = false;
  private readonly kinds: Set<string>;
  private readonly concurrency: number;
  /** Live tasks, so stop() can drain instead of aborting work. */
  private readonly running = new Set<Promise<void>>();
  /** Serialises claim transactions; job bodies still run in parallel. */
  private claimChain: Promise<void> = Promise.resolve();
  /** Built once on first email job; undefined until then, null when SMTP is unconfigured. */
  private mailerInstance?: Mailer | null;

  private mailer(): Mailer | null {
    if (this.mailerInstance === undefined)
      this.mailerInstance = createMailer(this.service.config);
    return this.mailerInstance;
  }

  constructor(
    public service: ProductService,
    private billing: Billing,
    options: WorkerOptions = {},
  ) {
    this.kinds = new Set(options.kinds ?? []);
    this.concurrency = Math.max(1, options.concurrency ?? 1);
  }

  /**
   * Claim at most one job and run it to a terminal state.
   * Returns true when a job was processed, false when there was nothing to do
   * or this instance is already at its concurrency limit.
   */
  async once(): Promise<boolean> {
    if (this.stopping || this.inFlight >= this.concurrency) return false;
    const job = await this.claim();
    if (!job) return false;
    this.inFlight++;
    const task = this.runJob(job)
      .catch(() =>
        console.error(JSON.stringify({ event: "worker.tick_failure" })),
      )
      .finally(() => {
        this.inFlight--;
        this.running.delete(task);
      });
    this.running.add(task);
    await task;
    return true;
  }

  /** Run one claimed job in its request trace, whichever loop claimed it. */
  private runJob(job: any) {
    return withTraceId(job.trace_id, () => this.run(job));
  }

  /**
   * A lease that outlives a slow handler. AI work is bounded by
   * config.aiTimeout, so a job finishing inside that window must never have its
   * row stolen mid-flight and run twice by another worker.
   */
  leaseFor(kind: string): number {
    const aiWork = kind === "generate" || kind === "ai-eval";
    const base = aiWork
      ? Math.max(
          LONG_LEASE_MS,
          this.service.config.aiTimeout * 2 + 30000,
        )
      : BASE_LEASE_MS;
    return Math.min(MAX_LEASE_MS, Math.max(BASE_LEASE_MS, base));
  }

  private async claim(): Promise<any | null> {
    const kinds = [...this.kinds];
    return this.service.db.transaction(async (tx) => {
      const params: unknown[] = [Date.now()];
      let kindFilter = "";
      if (kinds.length) {
        params.push(kinds);
        kindFilter = ` AND kind = ANY($${params.length})`;
      }
      const [row] = await tx.query(
        `SELECT * FROM jobs WHERE ((state='pending' AND available_at<=$1) OR (state='processing' AND lease_until<$1))${kindFilter} ORDER BY available_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
        params,
      );
      if (!row) return null;
      await tx.query(
        "UPDATE jobs SET state='processing',attempts=attempts+1,lease_until=$1,updated_at=now() WHERE id=$2",
        [Date.now() + this.leaseFor(row.kind), row.id],
      );
      return { ...row, attempts: row.attempts + 1 };
    });
  }

  private async run(job: any): Promise<void> {
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
      else if (job.kind === "email") {
        const mailer = this.mailer();
        if (!mailer)
          throw new HttpError(
            503,
            "Email is not configured on the server; the message was not sent.",
          );
        try {
          await sendEmail(mailer, this.service.config, payload as MailMessage);
        } catch (error) {
          // 5xx and auth failures never heal: fail the job now so the operator sees it
          // instead of burning the three attempts on credentials the provider rejects.
          if (!isTransientMailError(error))
            throw new HttpError(
              400,
              `Email to ${payload.purpose} address was rejected by the provider.`,
            );
          throw error;
        }
      }
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
      if (job.kind === "email") {
        this.service.metrics.emailFailures++;
        console.error(
          JSON.stringify({
            event: "email.failure",
            id: job.id,
            traceId: job.trace_id ?? null,
            purpose: job.payload?.purpose,
            dead,
            attempts: job.attempts,
          }),
        );
        if (dead)
          await this.service.audit(
            job.workspace_id,
            null,
            "email.needs_review",
            job.id,
            { purpose: job.payload?.purpose },
          );
      }
      console.error(
        JSON.stringify({
          event: "job.failure",
          id: job.id,
          traceId: job.trace_id ?? null,
          kind: job.kind,
          dead,
          attempts: job.attempts,
        }),
      );
      if (this.service.config.sentryDsn) {
        Sentry.withScope((scope) => {
          scope.setTag("jobKind", job.kind);
          scope.setTag("jobId", String(job.id));
          scope.setTag("dead", String(dead));
          if (job.workspace_id) scope.setTag("workspaceId", String(job.workspace_id));
          Sentry.captureException(error);
        });
      }
    } finally {
      if (job.workspace_id) this.service.changed(job.workspace_id);
    }
  }

  /**
   * Poll loop. Each tick tops the instance back up to `concurrency` claims, so a
   * burst of inbound messages is absorbed by parallel work instead of queueing
   * behind one claim per tick. The slot is reserved synchronously before the
   * claim transaction opens, which stops the loop from over-claiming while a row
   * lock is still being taken.
   */
  start() {
    if (this.timer) return;
    this.stopping = false;
    this.timer = setInterval(() => {
      this.lastTick = Date.now();
      if (this.stopping) return;
      // Fill every free slot, not just one. A single claim per tick capped the
      // whole process at ~6 jobs/s, which is far below one inbound message per
      // customer action and let the queue grow without bound under load.
      for (let i = this.inFlight; i < this.concurrency; i++) this.pump();
    }, 150);
    this.timer.unref();
  }

  /** Issue one claim, reserving its slot until the job finishes. */
  private pump() {
    this.inFlight++;
    let claimed = false;
    // Claims are serialised through this chain: a claim is a short transaction,
    // so serialising costs microseconds, while issuing several at once opens
    // parallel transactions that a single-writer engine (PGlite, a small pool)
    // slows down or deadlocks on. The jobs themselves still run in parallel.
    const claimable = this.claimChain.then(() => this.claim());
    this.claimChain = claimable.then(
      () => undefined,
      () => undefined,
    );
    void claimable
      .then((job) => {
        if (!job) return;
        claimed = true;
        const task = this.runJob(job)
          .catch(() =>
            console.error(JSON.stringify({ event: "worker.tick_failure" })),
          )
          .finally(() => {
            this.inFlight--;
            this.running.delete(task);
          });
        this.running.add(task);
        return task;
      })
      .catch(() =>
        console.error(JSON.stringify({ event: "worker.unavailable" })),
      )
      .finally(() => {
        // Nothing claimable: release the reserved slot so the next tick can try
        // again. A claimed job releases its slot when the job ends.
        if (!claimed) this.inFlight--;
      });
  }

  /** True while the poll loop is alive; background work stops without it. */
  healthy() {
    // The heartbeat must tolerate a long, legitimate job: the poll loop runs
    // every 150ms but one generation/maintenance pass can take a few seconds,
    // so 15 seconds risked a false "degraded" during heavy maintenance.
    return this.lastTick > 0 && Date.now() - this.lastTick < 30000;
  }

  /** Jobs in flight on this instance — surfaced on /api/ready. */
  active() {
    return this.inFlight;
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

  /** Stop polling, then let in-flight jobs finish so no row is left leased. */
  async stop() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // A claim may still be in flight; wait for it so no row is left leased.
    await this.claimChain.catch(() => undefined);
    while (this.running.size) await Promise.allSettled([...this.running]);
  }
}
