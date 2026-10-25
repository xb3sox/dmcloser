import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit, MemoryStore, type Store, type ClientRateLimitInfo, type Options } from "express-rate-limit";

export class PostgresRateLimitStore implements Store {
  windowMs = 60000;

  constructor(private db: Database) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const expiresAt = now + this.windowMs;
    const [row] = await this.db.query<{ hits: number; expires_at: string | number }>(
      `INSERT INTO rate_limits (key, hits, expires_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE WHEN rate_limits.expires_at < $3 THEN 1 ELSE rate_limits.hits + 1 END,
         expires_at = CASE WHEN rate_limits.expires_at < $3 THEN $2 ELSE rate_limits.expires_at END
       RETURNING hits, expires_at`,
      [key, expiresAt, now],
    );
    return {
      totalHits: row.hits,
      resetTime: new Date(Number(row.expires_at)),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.db.query(
      `UPDATE rate_limits SET hits = GREATEST(hits - 1, 0) WHERE key = $1 AND expires_at >= $2`,
      [key, Date.now()],
    );
  }

  async resetKey(key: string): Promise<void> {
    await this.db.query(`DELETE FROM rate_limits WHERE key = $1`, [key]);
  }
}
import { z } from "zod";
import { randomUUID, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createMailer } from "./mail.ts";
import type { Config } from "./config.ts";
import type { Database } from "./db.ts";
import { createAI, type AIEngine } from "./ai.ts";
import { MetaProvider, ProviderError } from "./providers.ts";
import {
  ProductService,
  emptySettings,
  decodeCursor,
  type Actor,
} from "./service.ts";
import { Billing } from "./billing.ts";
import { Worker } from "./worker.ts";
import { mountRevenueRoutes } from "./revenue-routes.ts";
import { mountQualityRoutes } from "./quality-routes.ts";
import {
  digest,
  equal,
  hashPassword,
  HttpError,
  randomToken,
  validMetaSignature,
  verifyPassword,
} from "./security.ts";

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      requestId: string;
    }
  }
}
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128);
const settingsSchema = z
  .object({
    businessName: z.string().trim().min(1).max(100),
    businessDescription: z.string().trim().min(1).max(2000),
    productsSold: z.string().trim().min(1).max(1000),
    tone: z.enum(["friendly", "premium", "aggressive"]),
    autoReplyEnabled: z.boolean(),
    autoSendConfidenceThreshold: z.number().int().min(50).max(100),
  })
  .partial()
  .strict();

export async function createApp(
  config: Config,
  db: Database,
  overrides: { ai?: AIEngine; meta?: MetaProvider } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);
  const service = new ProductService(
    db,
    config,
    overrides.ai || createAI(config),
    overrides.meta || new MetaProvider(config),
  );
  const billing = new Billing(service);
  const worker = new Worker(service, billing, {
    concurrency: config.workerConcurrency,
    kinds: config.workerKinds,
  });
  const cookieName = config.production ? "__Host-dmcloser" : "dmcloser_session";
  const origins = new Set([
    config.appUrl,
    ...(!config.production
      ? ["http://localhost:5173", "http://127.0.0.1:5173"]
      : []),
  ]);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    const start = performance.now();
    res.on("finish", () => {
      if (!req.path.includes("/events"))
        console.log(
          JSON.stringify({
            event: "http",
            method: req.method,
            path: req.path.replace(/\/[^/]{32,}/g, "/:id"),
            status: res.statusCode,
            ms: Math.round(performance.now() - start),
            requestId: req.requestId,
          }),
        );
    });
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: config.production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
              ],
              fontSrc: ["'self'", "https://fonts.gstatic.com"],
              imgSrc: ["'self'", "data:"],
              connectSrc: ["'self'"],
              frameAncestors: ["'none'"],
              formAction: ["'self'"],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(
    cors({
      credentials: true,
      origin: (origin, done) => done(null, !origin || origins.has(origin)),
    }),
  );
  const createRateLimitStore = (): Store =>
    db.kind === "postgres"
      ? new PostgresRateLimitStore(db)
      : new MemoryStore();

  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      store: createRateLimitStore(),
      message: { error: "Too many requests. Please wait a minute." },
    }),
  );
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  for (const platform of ["instagram", "whatsapp"] as const) {
    app.get(`/api/webhooks/${platform}`, (req, res) => {
      const token = String(req.query["hub.verify_token"] || "");
      if (
        !config.verifyToken ||
        req.query["hub.mode"] !== "subscribe" ||
        !equal(token, config.verifyToken)
      )
        throw new HttpError(403, "Verification failed.");
      res.type("text").send(String(req.query["hub.challenge"] || ""));
    });
    app.post(
      `/api/webhooks/${platform}`,
      express.raw({ type: "application/json", limit: "256kb" }),
      async (req, res) => {
        const secret =
          platform === "instagram" ? config.instagramSecret : config.metaSecret;
        if (
          !Buffer.isBuffer(req.body) ||
          !validMetaSignature(req.body, req.get("x-hub-signature-256"), secret)
        )
          throw new HttpError(401, "Invalid webhook signature.");
        let payload: any;
        try {
          payload = JSON.parse(req.body.toString());
        } catch {
          throw new HttpError(400, "Invalid JSON.");
        }
        if (
          payload?.object !==
          (platform === "instagram" ? "instagram" : "whatsapp_business_account")
        )
          throw new HttpError(400, "Unexpected webhook object.");
        const id = digest(Buffer.concat([Buffer.from(platform), req.body]));
        await db.transaction(async (tx) => {
          const inserted = await tx.query(
            "INSERT INTO webhook_receipts(id,platform,payload) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",
            [id, platform, JSON.stringify(payload)],
          );
          if (inserted.length)
            await service.enqueue(
              "webhook",
              { receiptId: id },
              null,
              `webhook:${id}`,
              0,
              tx,
            );
        });
        res.status(200).json({ accepted: true });
      },
    );
  }
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      if (!billing.stripe || !config.stripeWebhookSecret)
        throw new HttpError(503, "Billing is not configured.");
      let event;
      try {
        event = billing.stripe.webhooks.constructEvent(
          req.body,
          req.get("stripe-signature") || "",
          config.stripeWebhookSecret,
        );
      } catch {
        throw new HttpError(401, "Invalid billing signature.");
      }
      await db.transaction(async (tx) => {
        const inserted = await tx.query(
          "INSERT INTO webhook_receipts(id,platform,payload) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",
          [event.id, "stripe", JSON.stringify(event)],
        );
        if (inserted.length)
          await service.enqueue(
            "billing",
            { event },
            null,
            `billing:${event.id}`,
            0,
            tx,
          );
      });
      res.json({ accepted: true });
    },
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());

  for (const action of ["data-deletion", "deauthorize"]) {
    app.post(
      `/api/integrations/instagram/${action}`,
      express.urlencoded({ extended: false, limit: "16kb" }),
      async (req, res) => {
        const signed = z.string().max(12000).parse(req.body?.signed_request);
        const [signature, encoded, extra] = signed.split(".");
        if (
          !config.instagramSecret ||
          !signature ||
          !encoded ||
          extra ||
          !equal(
            createHmac("sha256", config.instagramSecret)
              .update(encoded)
              .digest("base64url"),
            signature,
          )
        )
          throw new HttpError(401, "Invalid provider signature.");
        let parsed: any;
        try {
          parsed = JSON.parse(
            Buffer.from(encoded, "base64url").toString("utf8"),
          );
        } catch {
          throw new HttpError(400, "Invalid signed payload.");
        }
        if (
          parsed.algorithm !== "HMAC-SHA256" ||
          !/^\d+$/.test(String(parsed.user_id)) ||
          !Number.isFinite(parsed.issued_at) ||
          Math.abs(Date.now() / 1000 - parsed.issued_at) > 86400
        )
          throw new HttpError(400, "Invalid or expired signed request.");
        const requestHash = digest(signed);
        const [previous] = await db.query(
          "SELECT code FROM deletion_requests WHERE request_hash=$1",
          [requestHash],
        );
        const code = previous?.code || randomToken();
        if (!previous)
          await db.transaction(async (tx) => {
            const connections = await tx.query(
              "SELECT id,workspace_id FROM connections WHERE platform='instagram' AND account_id=$1",
              [String(parsed.user_id)],
            );
            for (const connection of connections) {
              await tx.query(
                "DELETE FROM conversations WHERE connection_id=$1 AND workspace_id=$2",
                [connection.id, connection.workspace_id],
              );
              await tx.query(
                "DELETE FROM connections WHERE id=$1 AND workspace_id=$2",
                [connection.id, connection.workspace_id],
              );
              await service.audit(
                connection.workspace_id,
                null,
                "instagram.data_deleted",
                undefined,
                {},
                tx,
              );
              service.changed(connection.workspace_id);
            }
            const receipts = await tx.query(
              "SELECT id,payload FROM webhook_receipts WHERE platform='instagram' AND payload::text LIKE $1",
              [`%${String(parsed.user_id)}%`],
            );
            for (const receipt of receipts)
              if (Array.isArray(receipt.payload.entry))
                await tx.query(
                  "UPDATE webhook_receipts SET payload=$1 WHERE id=$2",
                  [
                    JSON.stringify({
                      ...receipt.payload,
                      entry: receipt.payload.entry.filter(
                        (entry: any) =>
                          String(entry.id) !== String(parsed.user_id),
                      ),
                    }),
                    receipt.id,
                  ],
                );
            await tx.query(
              "INSERT INTO deletion_requests(code,request_hash) VALUES($1,$2) ON CONFLICT DO NOTHING",
              [code, requestHash],
            );
          });
        res.json(
          action === "data-deletion"
            ? {
                url: `${config.publicUrl}/api/data-deletion/${code}`,
                confirmation_code: code,
              }
            : { ok: true },
        );
      },
    );
  }
  app.get("/api/data-deletion/:code", async (req, res) => {
    const [row] = await db.query(
      "SELECT completed_at FROM deletion_requests WHERE code=$1",
      [req.params.code],
    );
    if (!row) throw new HttpError(404, "Confirmation not found.");
    res.json({ status: "completed", completedAt: row.completed_at });
  });

  const mailer = createMailer(config);
  async function emailToken(
    user: any,
    purpose: "verify" | "reset",
    workspaceId?: string,
  ) {
    if (!mailer)
      throw new HttpError(
        503,
        "Email delivery is not configured. Contact the service owner.",
      );
    const token = randomToken();
    await db.query(
      "INSERT INTO tokens(hash,user_id,purpose,expires_at) VALUES($1,$2,$3,$4)",
      [digest(token), user.id, purpose, Date.now() + 3600000],
    );
    const url = `${config.appUrl}/workspace?${purpose}=${encodeURIComponent(token)}`;
    // Queue the send: SMTP latency must not sit in a signup or recovery request,
    // and a bounce has to reach the activity feed instead of a swallowed promise.
    const target =
      workspaceId ??
      (
        await db.query(
          "SELECT workspace_id FROM members WHERE user_id=$1 LIMIT 1",
          [user.id],
        )
      )[0]?.workspace_id ??
      null;
    await service.enqueue(
      "email",
      {
        to: user.email,
        subject:
          purpose === "reset"
            ? "Reset your DMCloser password"
            : "Verify your DMCloser email",
        text: `${purpose === "reset" ? "Reset your password" : "Verify your email"} using this single-use link (expires in one hour):\n${url}\n\nIf you did not request this, ignore this email.`,
        purpose,
      },
      target,
    );
  }
  async function readActor(req: Request): Promise<Actor | undefined> {
    const token = req.cookies?.[cookieName];
    if (typeof token !== "string") return;
    const [row] = await db.query(
      "SELECT s.*,u.email,u.name,u.verified,m.role FROM sessions s JOIN users u ON u.id=s.user_id JOIN members m ON m.user_id=s.user_id AND m.workspace_id=s.workspace_id WHERE s.hash=$1 AND s.expires_at>$2",
      [digest(token), Date.now()],
    );
    if (row)
      return {
        userId: row.user_id,
        workspaceId: row.workspace_id,
        role: row.role,
        email: row.email,
        name: row.name,
        verified: row.verified,
        csrf: row.csrf,
        sessionHash: row.hash,
      };
  }
  const auth = async (req: Request, _res: Response, next: NextFunction) => {
    req.actor = await readActor(req);
    if (!req.actor)
      throw new HttpError(401, "Your session has expired. Sign in again.");
    next();
  };
  const owner = (req: Request, _res: Response, next: NextFunction) => {
    if (req.actor?.role !== "owner")
      throw new HttpError(403, "Only the workspace owner can do this.");
    next();
  };
  const origin = (req: Request, _res: Response, next: NextFunction) => {
    if (!origins.has(req.get("origin") || ""))
      throw new HttpError(
        403,
        "This request must come from the DMCloser application.",
      );
    next();
  };
  const csrf = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.actor || !equal(req.get("x-csrf-token") || "", req.actor.csrf))
      throw new HttpError(403, "Refresh the page and try again.");
    next();
  };
  const canConnect = (req: Request, _res: Response, next: NextFunction) => {
    if (config.production && !req.actor?.verified)
      throw new HttpError(
        403,
        "Verify your email before connecting a live account.",
      );
    next();
  };
  async function issueSession(
    res: Response,
    userId: string,
    workspaceId: string,
  ) {
    const token = randomToken();
    await db.query(
      "INSERT INTO sessions(hash,user_id,workspace_id,csrf,expires_at) VALUES($1,$2,$3,$4,$5)",
      [
        digest(token),
        userId,
        workspaceId,
        randomToken(),
        Date.now() + 7 * 86400000,
      ],
    );
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: config.production,
      sameSite: "lax",
      maxAge: 7 * 86400000,
      path: "/",
    });
  }
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: createRateLimitStore(),
    message: { error: "Too many sign-in attempts. Please wait 15 minutes." },
  });
  const recoveryLimit = rateLimit({
    windowMs: 3600000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: createRateLimitStore(),
    message: { error: "Too many recovery requests. Please try later." },
  });

  app.get("/api/health", async (_req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok", service: "dmcloser", storage: db.kind });
  });
  // Liveness is /api/health. Readiness also requires the job worker to be
  // polling, because a stopped worker silently stops all inbound processing.
  app.get("/api/ready", async (_req, res) => {
    await db.query("SELECT 1");
    const ready = worker.healthy();
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "degraded",
      service: "dmcloser",
      storage: db.kind,
      worker: ready ? "polling" : "stopped",
      activeJobs: worker.active(),
      workerConcurrency: config.workerConcurrency,
    });
  });
  app.get("/internal/metrics", async (req, res) => {
    if (
      !config.metricsToken ||
      !equal(req.get("authorization") || "", `Bearer ${config.metricsToken}`)
    )
      throw new HttpError(404, "Not found.");
    const [jobs] = await db.query(
      "SELECT count(*) FILTER (WHERE state='dead')::integer AS dead_jobs,count(*) FILTER (WHERE state='pending')::integer AS pending_jobs,MIN(available_at) FILTER (WHERE state='pending') AS oldest_pending FROM jobs",
    );
    const [latency] = await db.query(
      "SELECT count(*)::integer AS samples,percentile_cont(.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,percentile_cont(.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,percentile_cont(.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_ms FROM suggestions WHERE created_at>now()-interval '1 hour'",
    );
    const [stages] = await db.query(
      "SELECT count(*)::integer AS samples,avg(ingest_ms)::integer AS avg_ingest_ms,percentile_cont(.95) WITHIN GROUP (ORDER BY ingest_ms) AS p95_ingest_ms,avg(persistence_ms)::integer AS avg_persistence_ms,percentile_cont(.95) WITHIN GROUP (ORDER BY persistence_ms) AS p95_persistence_ms,avg(model_ms)::integer AS avg_model_ms,percentile_cont(.95) WITHIN GROUP (ORDER BY model_ms) AS p95_model_ms,avg(draft_write_ms)::integer AS avg_draft_write_ms,percentile_cont(.95) WITHIN GROUP (ORDER BY draft_write_ms) AS p95_draft_write_ms FROM suggestions WHERE created_at>now()-interval '1 hour'",
    );
    const [histogram] = await db.query(
      "SELECT count(*) FILTER (WHERE latency_ms <= 250)::integer AS le_250,count(*) FILTER (WHERE latency_ms <= 500)::integer AS le_500,count(*) FILTER (WHERE latency_ms <= 1000)::integer AS le_1000,count(*) FILTER (WHERE latency_ms <= 1500)::integer AS le_1500,count(*) FILTER (WHERE latency_ms <= 2000)::integer AS le_2000,count(*) FILTER (WHERE latency_ms <= 3000)::integer AS le_3000,count(*) FILTER (WHERE latency_ms <= 5000)::integer AS le_5000,count(*) FILTER (WHERE latency_ms > 5000)::integer AS gt_5000 FROM suggestions WHERE created_at>now()-interval '1 hour'",
    );
    res.json({
      status: "ok",
      metrics: service.metrics,
      jobs: {
        ...jobs,
        oldestPendingAgeMs: jobs.oldest_pending
          ? Math.max(0, Date.now() - Number(jobs.oldest_pending))
          : 0,
      },
      latency,
      stages,
      histogram,
    });
  });
  app.get("/api/session", async (req, res) => {
    const actor = await readActor(req);
    res.json(
      actor
        ? {
            user: {
              id: actor.userId,
              name: actor.name,
              email: actor.email,
              role: actor.role,
              verified: actor.verified,
            },
            csrf: actor.csrf,
          }
        : { user: null },
    );
  });
  app.post("/api/auth/register", origin, authLimit, async (req, res) => {
    const body = z
      .object({
        email: emailSchema,
        password: passwordSchema,
        name: z.string().trim().min(1).max(100),
        businessName: z.string().trim().min(1).max(100),
      })
      .strict()
      .parse(req.body);
    if (config.production && !mailer)
      throw new HttpError(
        503,
        "Registration is temporarily unavailable until email delivery is configured.",
      );
    const userId = randomUUID(),
      workspaceId = randomUUID();
    const passwordHash = await hashPassword(body.password);
    try {
      await db.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",
          [userId, body.email, body.name, passwordHash],
        );
        await tx.query(
          "INSERT INTO workspaces(id,owner_id,settings,trial_until) VALUES($1,$2,$3,$4)",
          [
            workspaceId,
            userId,
            JSON.stringify({
              ...emptySettings,
              businessName: body.businessName,
            }),
            Date.now() + 14 * 86400000,
          ],
        );
        await tx.query(
          "INSERT INTO members(workspace_id,user_id,role) VALUES($1,$2,$3)",
          [workspaceId, userId, "owner"],
        );
      });
    } catch (error: any) {
      if (error.code === "23505")
        throw new HttpError(
          409,
          "An account with this email already exists. Sign in instead.",
        );
      throw error;
    }
    await issueSession(res, userId, workspaceId);
    await service.audit(workspaceId, userId, "workspace.created");
    if (mailer)
      emailToken({ id: userId, email: body.email }, "verify", workspaceId).catch(
        (error) =>
          console.error(
            JSON.stringify({
              event: "email.enqueue_failed",
              purpose: "verify",
              reason: error instanceof Error ? error.message : "unknown",
            }),
          ),
      );
    res.status(201).json({ ok: true });
  });
  const dummyHash = await hashPassword(randomToken());
  app.post("/api/auth/login", origin, authLimit, async (req, res) => {
    const body = z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    const [user] = await db.query("SELECT * FROM users WHERE email=$1", [
      body.email,
    ]);
    const valid = await verifyPassword(
      body.password,
      user?.password_hash || dummyHash,
    );
    if (!user || !valid)
      throw new HttpError(401, "Email or password is incorrect.");
    const [membership] = await db.query(
      "SELECT workspace_id FROM members WHERE user_id=$1 ORDER BY role DESC LIMIT 1",
      [user.id],
    );
    if (!membership)
      throw new HttpError(403, "This account no longer has a workspace.");
    const previous = req.cookies?.[cookieName];
    if (previous)
      await db.query("DELETE FROM sessions WHERE hash=$1", [digest(previous)]);
    await issueSession(res, user.id, membership.workspace_id);
    res.json({ ok: true });
  });
  app.post("/api/auth/recover", origin, recoveryLimit, async (req, res) => {
    const { email } = z.object({ email: emailSchema }).strict().parse(req.body);
    if (!mailer)
      throw new HttpError(
        503,
        "Password recovery email is not configured. Contact the service owner.",
      );
    const [user] = await db.query("SELECT id,email FROM users WHERE email=$1", [
      email,
    ]);
    if (user) await emailToken(user, "reset");
    res.json({
      message: "If an account exists, a recovery email has been sent.",
    });
  });
  app.post("/api/auth/reset", origin, authLimit, async (req, res) => {
    const body = z
      .object({ token: z.string().min(32).max(200), password: passwordSchema })
      .strict()
      .parse(req.body);
    const hash = await hashPassword(body.password);
    await db.transaction(async (tx) => {
      const [token] = await tx.query(
        "DELETE FROM tokens WHERE hash=$1 AND purpose='reset' AND expires_at>$2 RETURNING user_id",
        [digest(body.token), Date.now()],
      );
      if (!token)
        throw new HttpError(400, "This recovery link is invalid or expired.");
      await tx.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        hash,
        token.user_id,
      ]);
      await tx.query("DELETE FROM sessions WHERE user_id=$1", [token.user_id]);
    });
    res.json({ ok: true });
  });
  app.post("/api/auth/verify", origin, authLimit, async (req, res) => {
    const { token } = z
      .object({ token: z.string().min(32).max(200) })
      .strict()
      .parse(req.body);
    await db.transaction(async (tx) => {
      const [row] = await tx.query(
        "DELETE FROM tokens WHERE hash=$1 AND purpose='verify' AND expires_at>$2 RETURNING user_id",
        [digest(token), Date.now()],
      );
      if (!row)
        throw new HttpError(
          400,
          "This verification link is invalid or expired.",
        );
      await tx.query("UPDATE users SET verified=true WHERE id=$1", [
        row.user_id,
      ]);
    });
    res.json({ ok: true });
  });

  app.get(
    "/api/integrations/instagram/callback",
    auth,
    owner,
    async (req, res) => {
      const state = String(req.query.state || "");
      const [token] = await db.query(
        "DELETE FROM tokens WHERE hash=$1 AND purpose='instagram' AND user_id=$2 AND workspace_id=$3 AND expires_at>$4 RETURNING data",
        [digest(state), req.actor!.userId, req.actor!.workspaceId, Date.now()],
      );
      if (!token || token.data.session !== req.actor!.sessionHash)
        throw new HttpError(
          400,
          "This account connection request expired. Please start again.",
        );
      if (req.query.error)
        return res.redirect(`${config.appUrl}/workspace?connection=cancelled`);
      try {
        const value = await service.meta.exchangeInstagram(
          z.string().min(1).max(3000).parse(req.query.code),
        );
        await service.connect(
          req.actor!.workspaceId,
          "instagram",
          value.accountId,
          value.label,
          value.token,
          value.expiresAt,
        );
        res.redirect(`${config.appUrl}/workspace?connection=connected`);
      } catch {
        res.redirect(`${config.appUrl}/workspace?connection=failed`);
      }
    },
  );

  app.use("/api", auth);
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    origin(req, res, (error) => (error ? next(error) : csrf(req, res, next)));
  });
  app.get("/api/bootstrap", async (req, res) =>
    res.json(
      await service.snapshot(
        req.actor!,
        req.query.include === undefined
          ? null
          : z.string().max(150).parse(req.query.include),
        {
          assignee: req.query.assignee ? z.string().max(100).parse(req.query.assignee) : null,
          channel: req.query.channel ? z.string().max(50).parse(req.query.channel) : null,
          intent: req.query.intent ? z.string().max(50).parse(req.query.intent) : null,
          unreadOnly: req.query.unread === "true" || req.query.unreadOnly === "true",
          leadStatus: req.query.leadStatus ? z.string().max(50).parse(req.query.leadStatus) : null,
          timeRange: req.query.timeRange ? z.string().max(50).parse(req.query.timeRange) : null,
          search: req.query.search ? z.string().max(200).parse(req.query.search) : null,
        },
      ),
    ),
  );
  app.get("/api/conversations", async (req, res) =>
    res.json(
      await service.conversationPage(req.actor!, {
        cursor:
          req.query.cursor === undefined
            ? null
            : decodeCursor(z.string().max(400).parse(req.query.cursor)),
        assignee:
          req.query.assignee === undefined
            ? null
            : z.string().max(100).parse(req.query.assignee),
        channel: req.query.channel ? z.string().max(50).parse(req.query.channel) : null,
        intent: req.query.intent ? z.string().max(50).parse(req.query.intent) : null,
        unreadOnly: req.query.unread === "true" || req.query.unreadOnly === "true",
        leadStatus: req.query.leadStatus ? z.string().max(50).parse(req.query.leadStatus) : null,
        timeRange: req.query.timeRange ? z.string().max(50).parse(req.query.timeRange) : null,
        search: req.query.search ? z.string().max(200).parse(req.query.search) : null,
      }),
    ),
  );
  app.get("/api/workspaces", async (req, res) => {
    const rows = await db.query(
      "SELECT w.id,w.settings->>'businessName' AS name,m.role FROM members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 ORDER BY w.id",
      [req.actor!.userId],
    );
    res.json(rows);
  });
  app.post("/api/workspaces/switch", async (req, res) => {
    const { workspaceId } = z
      .object({ workspaceId: z.string().uuid() })
      .strict()
      .parse(req.body);
    const [member] = await db.query(
      "SELECT role FROM members WHERE user_id=$1 AND workspace_id=$2",
      [req.actor!.userId, workspaceId],
    );
    if (!member) throw new HttpError(404, "Workspace not found.");
    await db.query("UPDATE sessions SET workspace_id=$1 WHERE hash=$2", [
      workspaceId,
      req.actor!.sessionHash,
    ]);
    res.json({ ok: true });
  });
  app.post("/api/auth/logout", async (req, res) => {
    await db.query("DELETE FROM sessions WHERE hash=$1", [
      req.actor!.sessionHash,
    ]);
    res.clearCookie(cookieName, {
      path: "/",
      secure: config.production,
      sameSite: "lax",
    });
    res.json({ ok: true });
  });
  app.post("/api/auth/verify-email", recoveryLimit, async (req, res) => {
    await emailToken(
      { id: req.actor!.userId, email: req.actor!.email },
      "verify",
      req.actor!.workspaceId,
    );
    res.json({ message: "Verification email sent." });
  });
  app.post("/api/auth/password", authLimit, async (req, res) => {
    const body = z
      .object({
        currentPassword: z.string().max(128),
        password: passwordSchema,
      })
      .strict()
      .parse(req.body);
    const [user] = await db.query(
      "SELECT password_hash FROM users WHERE id=$1",
      [req.actor!.userId],
    );
    if (!(await verifyPassword(body.currentPassword, user.password_hash)))
      throw new HttpError(400, "Current password is incorrect.");
    const hash = await hashPassword(body.password);
    await db.transaction(async (tx) => {
      await tx.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        hash,
        req.actor!.userId,
      ]);
      await tx.query("DELETE FROM sessions WHERE user_id=$1 AND hash<>$2", [
        req.actor!.userId,
        req.actor!.sessionHash,
      ]);
    });
    res.json({ ok: true });
  });
  app.get("/api/events", (req, res) => {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const notify = () => res.write("event: sync\ndata: {}\n\n");
    notify();
    service.events.on(req.actor!.workspaceId, notify);
    const heartbeat = setInterval(() => {
      db.query("SELECT hash FROM sessions WHERE hash=$1 AND expires_at>$2", [
        req.actor!.sessionHash,
        Date.now(),
      ])
        .then((rows) => {
          if (!rows.length) res.end();
          else notify();
        })
        .catch(() => res.end());
    }, 15000);
    req.on("close", () => {
      clearInterval(heartbeat);
      service.events.off(req.actor!.workspaceId, notify);
      // End the response too: a destroyed socket alone leaves the stream open on
      // some stacks, and an open stream keeps the process (and tests) alive.
      res.end();
    });
  });
  app.patch("/api/settings", owner, async (req, res) => {
    const body = settingsSchema.parse(req.body);
    const [workspace] = await db.query(
      "UPDATE workspaces SET settings=settings || $1::jsonb,updated_at=now() WHERE id=$2 RETURNING settings",
      [JSON.stringify(body), req.actor!.workspaceId],
    );
    await service.audit(
      req.actor!.workspaceId,
      req.actor!.userId,
      "settings.updated",
      undefined,
      { fields: Object.keys(body) },
    );
    service.changed(req.actor!.workspaceId);
    res.json(workspace.settings);
  });
  app.patch("/api/conversations/:id", async (req, res) => {
    const body = z
      .object({
        notes: z.string().max(2000).optional(),
        status: z
          .enum(["new", "engaged", "qualified", "converted", "lost"])
          .optional(),
        autoSend: z.boolean().optional(),
        unread: z.boolean().optional(),
        assigneeUserId: z.string().max(100).nullable().optional(),
      })
      .strict()
      .parse(req.body);
    const [conversation] = await db.query(
      "SELECT * FROM conversations WHERE id=$1 AND workspace_id=$2",
      [req.params.id, req.actor!.workspaceId],
    );
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    if (body.autoSend && conversation.intent === "spam")
      throw new HttpError(409, "Automatic replies are disabled for spam.");
    if (body.autoSend) {
      const [opportunity] = await db.query(
        "SELECT escalated,stage FROM deals WHERE workspace_id=$1 AND conversation_id=$2",
        [req.actor!.workspaceId, conversation.id],
      );
      if (opportunity?.escalated)
        throw new HttpError(
          409,
          "Resolve the human escalation before enabling automatic replies.",
        );
      if (["won", "lost"].includes(opportunity?.stage))
        throw new HttpError(
          409,
          "Automatic replies are disabled for closed opportunities.",
        );
    }
    let assigneeUserId = conversation.assignee_user_id;
    if (body.assigneeUserId !== undefined) {
      if (body.assigneeUserId !== null && body.assigneeUserId !== "") {
        const [member] = await db.query(
          "SELECT 1 FROM members WHERE workspace_id=$1 AND user_id=$2",
          [req.actor!.workspaceId, body.assigneeUserId],
        );
        if (!member)
          throw new HttpError(
            400,
            "Assignee must be a member of this workspace.",
          );
        assigneeUserId = body.assigneeUserId;
      } else {
        assigneeUserId = null;
      }
    }
    await db.query(
      "UPDATE conversations SET notes=$1,status=$2,auto_send=$3,unread=$4,assignee_user_id=$5,updated_at=now() WHERE id=$6 AND workspace_id=$7",
      [
        body.notes ?? conversation.notes,
        body.status ?? conversation.status,
        body.autoSend ?? conversation.auto_send,
        body.unread ?? conversation.unread,
        assigneeUserId,
        conversation.id,
        req.actor!.workspaceId,
      ],
    );
    if (body.autoSend) {
      const [suggestion] = await db.query(
        "SELECT source_id FROM suggestions WHERE conversation_id=$1 AND workspace_id=$2 AND status='ready' ORDER BY created_at DESC LIMIT 1",
        [conversation.id, req.actor!.workspaceId],
      );
      if (suggestion)
        await service.enqueue(
          "auto-send",
          { conversationId: conversation.id, sourceId: suggestion.source_id },
          req.actor!.workspaceId,
          randomUUID(),
          2500,
        );
    }
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  async function conversationExists(id: string, workspaceId: string) {
    const [row] = await db.query(
      "SELECT id FROM conversations WHERE id=$1 AND workspace_id=$2",
      [id, workspaceId],
    );
    if (!row) throw new HttpError(404, "Conversation not found.");
  }
  app.put("/api/conversations/:id/draft", async (req, res) => {
    const { text } = z
      .object({ text: z.string().max(4000) })
      .strict()
      .parse(req.body);
    await conversationExists(String(req.params.id), req.actor!.workspaceId);
    await db.query(
      "INSERT INTO drafts(workspace_id,conversation_id,user_id,text) VALUES($1,$2,$3,$4) ON CONFLICT(conversation_id,user_id) DO UPDATE SET text=EXCLUDED.text,updated_at=now()",
      [req.actor!.workspaceId, req.params.id, req.actor!.userId, text],
    );
    if (text.trim())
      await db.query(
        "UPDATE conversations SET hold_until=$1 WHERE id=$2 AND workspace_id=$3",
        [Date.now() + 90000, req.params.id, req.actor!.workspaceId],
      );
    res.json({ ok: true });
  });
  app.post("/api/conversations/:id/hold", async (req, res) => {
    await conversationExists(String(req.params.id), req.actor!.workspaceId);
    await db.query(
      "UPDATE conversations SET hold_until=$1 WHERE id=$2 AND workspace_id=$3",
      [Date.now() + 45000, req.params.id, req.actor!.workspaceId],
    );
    res.json({ ok: true });
  });
  app.post("/api/conversations/:id/messages", async (req, res) => {
    const body = z
      .object({
        text: z.string().trim().min(1).max(4096),
        sourceId: z.string().max(100).optional(),
      })
      .strict()
      .parse(req.body);
    const key = z.string().min(16).max(128).parse(req.get("idempotency-key"));
    const message = await service.queueMessage(
      req.actor!.workspaceId,
      req.actor!.userId,
      String(req.params.id),
      body.text,
      key,
      body.sourceId,
    );
    if (!message) throw new HttpError(409, "This reply is paused for review.");
    service.changed(req.actor!.workspaceId);
    res.status(202).json({ id: message.id, status: message.status });
  });
  app.post("/api/conversations/:id/generate", async (req, res) => {
    await conversationExists(String(req.params.id), req.actor!.workspaceId);
    const [latest] = await db.query(
      "SELECT id,sender FROM messages WHERE conversation_id=$1 AND workspace_id=$2 ORDER BY timestamp DESC,id DESC LIMIT 1",
      [req.params.id, req.actor!.workspaceId],
    );
    if (latest?.sender !== "contact")
      throw new HttpError(
        409,
        "Wait for a new inbound message before generating a reply.",
      );
    await db.query(
      "DELETE FROM suggestions WHERE source_id=$1 AND workspace_id=$2 AND status='ready'",
      [latest.id, req.actor!.workspaceId],
    );
    await service.enqueue(
      "generate",
      { conversationId: req.params.id, sourceId: latest.id },
      req.actor!.workspaceId,
    );
    res.status(202).json({ ok: true });
  });
  app.post("/api/messages/:id/retry", async (req, res) => {
    const [message] = await db.query(
      "SELECT * FROM messages WHERE id=$1 AND workspace_id=$2",
      [req.params.id, req.actor!.workspaceId],
    );
    if (!message || message.status !== "failed")
      throw new HttpError(
        409,
        "Only a confirmed failed delivery may be retried.",
      );
    await db.query(
      "UPDATE messages SET status='queued',error=NULL WHERE id=$1 AND workspace_id=$2",
      [message.id, req.actor!.workspaceId],
    );
    await service.enqueue(
      "deliver",
      { messageId: message.id },
      req.actor!.workspaceId,
    );
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.post("/api/messages/:id/resolve", owner, async (req, res) => {
    const body = z
      .object({
        outcome: z.enum(["sent", "not-sent"]),
        checkedProviderInbox: z.literal(true),
      })
      .strict()
      .parse(req.body);
    const rows = await db.query(
      "UPDATE messages SET status=$1,error=$2 WHERE id=$3 AND workspace_id=$4 AND status='uncertain' RETURNING id",
      [
        body.outcome === "sent" ? "sent" : "failed",
        body.outcome === "not-sent"
          ? "Owner confirmed non-delivery; safe to retry."
          : null,
        req.params.id,
        req.actor!.workspaceId,
      ],
    );
    if (!rows.length) throw new HttpError(409, "No uncertain delivery found.");
    await service.audit(
      req.actor!.workspaceId,
      req.actor!.userId,
      "delivery.manually_resolved",
      String(req.params.id),
      { outcome: body.outcome },
    );
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });

  app.post(
    "/api/integrations/instagram/start",
    owner,
    canConnect,
    async (req, res) => {
      if (
        !config.instagramAppId ||
        !config.instagramSecret ||
        !config.verifyToken
      )
        throw new HttpError(
          503,
          "Instagram login is not configured by the service owner.",
        );
      const state = randomToken();
      await db.query(
        "INSERT INTO tokens(hash,user_id,workspace_id,purpose,expires_at,data) VALUES($1,$2,$3,$4,$5,$6)",
        [
          digest(state),
          req.actor!.userId,
          req.actor!.workspaceId,
          "instagram",
          Date.now() + 600000,
          JSON.stringify({ session: req.actor!.sessionHash }),
        ],
      );
      const params = new URLSearchParams({
        client_id: config.instagramAppId,
        redirect_uri: `${config.publicUrl}/api/integrations/instagram/callback`,
        response_type: "code",
        scope: "instagram_business_basic,instagram_business_manage_messages",
        state,
        force_reauth: "true",
      });
      res.json({ url: `https://www.instagram.com/oauth/authorize?${params}` });
    },
  );
  app.post(
    "/api/integrations/whatsapp",
    owner,
    canConnect,
    async (req, res) => {
      if (!config.metaSecret || !config.verifyToken)
        throw new HttpError(
          503,
          "WhatsApp webhooks are not configured by the service owner.",
        );
      const body = z
        .object({
          phoneNumberId: z.string().regex(/^\d{5,30}$/),
          accessToken: z.string().min(20).max(4096),
        })
        .strict()
        .parse(req.body);
      const label = await service.meta.inspectWhatsApp(
        body.phoneNumberId,
        body.accessToken,
      );
      await service.connect(
        req.actor!.workspaceId,
        "whatsapp",
        body.phoneNumberId,
        label,
        body.accessToken,
      );
      res.json({ ok: true });
    },
  );
  app.delete("/api/integrations/:platform", owner, async (req, res) => {
    const platform = z
      .enum(["instagram", "whatsapp"])
      .parse(req.params.platform);
    await db.transaction(async (tx) => {
      await tx.query(
        "DELETE FROM connections WHERE workspace_id=$1 AND platform=$2",
        [req.actor!.workspaceId, platform],
      );
      await tx.query(
        "UPDATE conversations SET auto_send=false WHERE workspace_id=$1 AND platform=$2",
        [req.actor!.workspaceId, platform],
      );
      await service.audit(
        req.actor!.workspaceId,
        req.actor!.userId,
        "account.disconnected",
        platform,
        {},
        tx,
      );
    });
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.post("/api/billing/checkout", owner, async (req, res) => {
    const body = z
      .object({
        plan: z.enum(["starter", "growth"]),
        interval: z.enum(["monthly", "yearly"]),
      })
      .strict()
      .parse(req.body);
    const key = z.string().min(16).max(128).parse(req.get("idempotency-key"));
    res.json({
      url: await billing.checkout(
        req.actor!.workspaceId,
        req.actor!.email,
        body.plan,
        body.interval,
        key,
      ),
    });
  });
  app.post("/api/billing/portal", owner, async (req, res) =>
    res.json({ url: await billing.portal(req.actor!.workspaceId) }),
  );

  app.post("/api/team/invites", owner, async (req, res) => {
    const { email } = z.object({ email: emailSchema }).strict().parse(req.body);
    const [workspace] = await db.query(
      "SELECT plan FROM workspaces WHERE id=$1",
      [req.actor!.workspaceId],
    );
    const [count] = await db.query(
      "SELECT count(*)::integer AS n FROM members WHERE workspace_id=$1",
      [req.actor!.workspaceId],
    );
    const [pending] = await db.query(
      "SELECT count(*)::integer AS n FROM tokens WHERE workspace_id=$1 AND purpose='invite' AND expires_at>$2",
      [req.actor!.workspaceId, Date.now()],
    );
    if (count.n + pending.n >= (workspace.plan === "growth" ? 5 : 2))
      throw new HttpError(409, "Your plan has no available team seats.");
    const token = randomToken();
    await db.query(
      "INSERT INTO tokens(hash,workspace_id,purpose,email,expires_at) VALUES($1,$2,$3,$4,$5)",
      [
        digest(token),
        req.actor!.workspaceId,
        "invite",
        email,
        Date.now() + 2 * 86400000,
      ],
    );
    const url = `${config.appUrl}/workspace?invite=${token}`;
    if (mailer)
      await service.enqueue(
        "email",
        {
          to: email,
          subject: "Your DMCloser workspace invitation",
          text: `Sign in with ${email} and accept your invitation:\n${url}\nThis link expires in 48 hours.`,
          purpose: "invite",
        },
        req.actor!.workspaceId,
      );
    await service.audit(
      req.actor!.workspaceId,
      req.actor!.userId,
      "team.invited",
    );
    res.json({ url, emailed: !!mailer });
  });
  app.post("/api/team/accept", canConnect, async (req, res) => {
    const { token } = z
      .object({ token: z.string().min(32).max(200) })
      .strict()
      .parse(req.body);
    await db.transaction(async (tx) => {
      const [invitation] = await tx.query(
        "DELETE FROM tokens WHERE hash=$1 AND purpose='invite' AND email=$2 AND expires_at>$3 RETURNING workspace_id",
        [digest(token), req.actor!.email, Date.now()],
      );
      if (!invitation)
        throw new HttpError(
          400,
          "Invitation is invalid, expired, or belongs to a different email.",
        );
      const [workspace] = await tx.query(
        "SELECT plan FROM workspaces WHERE id=$1 FOR UPDATE",
        [invitation.workspace_id],
      );
      const [count] = await tx.query(
        "SELECT count(*)::integer AS n FROM members WHERE workspace_id=$1",
        [invitation.workspace_id],
      );
      if (count.n >= (workspace.plan === "growth" ? 5 : 2))
        throw new HttpError(409, "This workspace has no available seats.");
      await tx.query(
        "INSERT INTO members(workspace_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT DO NOTHING",
        [invitation.workspace_id, req.actor!.userId],
      );
      await tx.query("UPDATE sessions SET workspace_id=$1 WHERE hash=$2", [
        invitation.workspace_id,
        req.actor!.sessionHash,
      ]);
    });
    res.json({ ok: true });
  });
  app.delete("/api/team/:userId", owner, async (req, res) => {
    if (req.params.userId === req.actor!.userId)
      throw new HttpError(400, "The workspace owner cannot be removed.");
    await db.transaction(async (tx) => {
      await tx.query(
        "DELETE FROM members WHERE workspace_id=$1 AND user_id=$2 AND role='member'",
        [req.actor!.workspaceId, req.params.userId],
      );
      await tx.query(
        "DELETE FROM sessions WHERE workspace_id=$1 AND user_id=$2",
        [req.actor!.workspaceId, req.params.userId],
      );
    });
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.get("/api/workspace/export", owner, async (req, res) => {
    const [workspace] = await db.query(
      "SELECT id,settings,plan,billing_status,trial_until FROM workspaces WHERE id=$1",
      [req.actor!.workspaceId],
    );
    const [conversations, messages, drafts, members, audit] = await Promise.all(
      [
        db.query(
          "SELECT * FROM conversations WHERE workspace_id=$1 ORDER BY last_at",
          [req.actor!.workspaceId],
        ),
        db.query(
          "SELECT id,conversation_id,sender,text,timestamp,status,error,automatic FROM messages WHERE workspace_id=$1 ORDER BY timestamp",
          [req.actor!.workspaceId],
        ),
        db.query(
          "SELECT conversation_id,user_id,text FROM drafts WHERE workspace_id=$1",
          [req.actor!.workspaceId],
        ),
        db.query(
          "SELECT u.name,u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1",
          [req.actor!.workspaceId],
        ),
        db.query(
          "SELECT action,resource_id,detail,created_at FROM audit_events WHERE workspace_id=$1 ORDER BY created_at",
          [req.actor!.workspaceId],
        ),
      ],
    );
    res.attachment("dmcloser-workspace.json").json({
      exportedAt: new Date().toISOString(),
      workspace,
      conversations,
      messages,
      drafts,
      members,
      audit,
      revenue: await service.revenue.export(req.actor!.workspaceId),
    });
  });
  app.delete("/api/workspace", owner, async (req, res) => {
    const { password } = z
      .object({ password: z.string().max(128) })
      .strict()
      .parse(req.body);
    const [user] = await db.query(
      "SELECT password_hash FROM users WHERE id=$1",
      [req.actor!.userId],
    );
    if (!(await verifyPassword(password, user.password_hash)))
      throw new HttpError(400, "Password is incorrect.");
    const [workspace] = await db.query(
      "SELECT stripe_subscription,stripe_customer FROM workspaces WHERE id=$1",
      [req.actor!.workspaceId],
    );
    if (workspace.stripe_subscription) {
      if (!billing.stripe)
        throw new HttpError(
          503,
          "Billing must be available to cancel your subscription before deletion.",
        );
      const subscription = await billing.stripe.subscriptions.retrieve(
        workspace.stripe_subscription,
      );
      if (subscription.status !== "canceled")
        await billing.stripe.subscriptions.cancel(subscription.id);
    }
    await db.transaction(async (tx) => {
      const connections = await tx.query(
        "SELECT platform,account_id FROM connections WHERE workspace_id=$1",
        [req.actor!.workspaceId],
      );
      for (const connection of connections)
        await service.redactAccountReceipts(
          connection.platform,
          connection.account_id,
          tx,
        );
      if (workspace.stripe_customer) {
        await tx.query(
          "DELETE FROM jobs WHERE kind='billing' AND payload::text LIKE $1",
          [`%${workspace.stripe_customer}%`],
        );
        await tx.query(
          "DELETE FROM webhook_receipts WHERE platform='stripe' AND payload::text LIKE $1",
          [`%${workspace.stripe_customer}%`],
        );
      }
      await tx.query("DELETE FROM workspaces WHERE id=$1", [
        req.actor!.workspaceId,
      ]);
      await tx.query(
        "DELETE FROM users WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM members WHERE user_id=$1)",
        [req.actor!.userId],
      );
    });
    res.clearCookie(cookieName, {
      path: "/",
      secure: config.production,
      sameSite: "lax",
    });
    service.changed(req.actor!.workspaceId);
    res.json({ ok: true });
  });
  app.post("/api/development/inbound", owner, async (req, res) => {
    if (config.production) throw new HttpError(404, "Not found.");
    const body = z
      .object({
        platform: z.enum(["instagram", "whatsapp"]),
        name: z.string().trim().min(1).max(100),
        text: z.string().trim().min(1).max(4000),
        contactId: z.string().max(80).optional(),
      })
      .strict()
      .parse(req.body);
    const accountId = `local-${req.actor!.workspaceId}-${body.platform}`;
    const [existing] = await db.query(
      "SELECT account_id FROM connections WHERE workspace_id=$1 AND platform=$2",
      [req.actor!.workspaceId, body.platform],
    );
    if (existing && existing.account_id !== accountId)
      throw new HttpError(
        409,
        "Use a separate local workspace to simulate messages; a real account is connected.",
      );
    if (!existing)
      await service.connect(
        req.actor!.workspaceId,
        body.platform,
        accountId,
        "Local simulator (cannot deliver)",
        randomToken(),
      );
    await service.ingest({
      platform: body.platform,
      accountId,
      externalId: body.contactId || randomUUID(),
      providerId: randomUUID(),
      name: body.name,
      text: body.text,
      timestamp: Date.now(),
      reviewOnly: false,
    });
    res.status(202).json({ ok: true });
  });
  app.get("/api/operations", owner, async (req, res) => {
    const jobs = await db.query(
      "SELECT id,kind,state,attempts,error,created_at FROM jobs WHERE workspace_id=$1 AND state IN ('dead','pending') ORDER BY created_at DESC LIMIT 30",
      [req.actor!.workspaceId],
    );
    const [latency] = await db.query(
      "SELECT count(*)::integer AS count,avg(latency_ms)::integer AS mean_ms,percentile_cont(.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms FROM suggestions WHERE workspace_id=$1 AND created_at>now()-interval '24 hours'",
      [req.actor!.workspaceId],
    );
    res.json({ jobs, latency, targetP95Ms: 2000 });
  });
  app.post("/api/operations/:id/retry", owner, async (req, res) => {
    const [job] = await db.query(
      "SELECT * FROM jobs WHERE id=$1 AND workspace_id=$2 AND state='dead'",
      [req.params.id, req.actor!.workspaceId],
    );
    if (!job || job.kind === "deliver")
      throw new HttpError(
        409,
        "Review delivery state in the conversation before retrying.",
      );
    await db.query(
      "UPDATE jobs SET state='pending',attempts=0,error=NULL,available_at=$1 WHERE id=$2 AND workspace_id=$3",
      [Date.now(), job.id, req.actor!.workspaceId],
    );
    res.json({ ok: true });
  });

  mountRevenueRoutes(app, service, owner);
  mountQualityRoutes(app, service, owner);
  app.use("/api", (_req, _res) => {
    throw new HttpError(404, "API endpoint not found.");
  });
  const dist = resolve("dist");
  if (config.production && existsSync(resolve(dist, "index.html"))) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get("/{*path}", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(resolve(dist, "index.html"));
    });
  }
  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return res.end();
    const status =
      error instanceof z.ZodError
        ? 400
        : error instanceof HttpError
          ? error.status
          : error instanceof ProviderError
            ? 502
            : error?.type === "entity.too.large"
              ? 413
              : error instanceof SyntaxError
                ? 400
                : error?.code === "23505"
                  ? 409
                  : 500;
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid input."
        : error instanceof HttpError || error instanceof ProviderError
          ? error.message
          : status === 409
            ? "This action conflicts with a recent update. Refresh and try again."
            : status === 413
              ? "Request is too large."
              : status === 400
                ? "Invalid request."
                : "Something went wrong. Please try again.";
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: "http.failure",
          requestId: req.requestId,
          path: req.path,
          status,
        }),
      );
    res.status(status).json({ error: message, requestId: req.requestId });
  });
  return { app, service, worker, billing };
}
