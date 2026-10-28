import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

export interface Config {
  production: boolean;
  port: number;
  appUrl: string;
  publicUrl: string;
  databaseUrl?: string;
  databaseSsl: boolean;
  dataDir: string;
  encryptionKey: string;
  openaiKey?: string;
  openaiModel: string;
  /** OpenAI-compatible base URL (DeepSeek, OpenRouter, local vLLM). Unset means api.openai.com. */
  openaiBaseUrl?: string;
  aiTimeout: number;
  /** Jobs one process runs at the same time. Keep AI work small. */
  workerConcurrency: number;
  /** Job kinds this process may claim. Empty means every kind. */
  workerKinds: string[];
  /** Run the poll loop in this process; false for a dedicated worker process. */
  workerEnabled: boolean;
  graphVersion: string;
  metaAppId?: string;
  metaSecret?: string;
  instagramAppId?: string;
  instagramSecret?: string;
  verifyToken?: string;
  stripeKey?: string;
  stripeWebhookSecret?: string;
  prices: Record<string, string | undefined>;
  smtpHost?: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  mailFrom: string;
  /** smtp (default), resend, or sink for tests. */
  mailProvider?: string;
  resendKey?: string;
  trustProxy: number;
  metricsToken?: string;
  sentryDsn?: string;
  sentryRelease?: string;
  rateLimitMax: number;
  authRateLimitMax: number;
  recoveryRateLimitMax: number;
}

export async function loadConfig(): Promise<Config> {
  const env = process.env;
  const production = env.NODE_ENV === "production";
  const dataDir = resolve(env.DATA_DIR || ".data");
  let encryptionKey = env.ENCRYPTION_KEY || "";
  if (!production && !encryptionKey) {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    const keyPath = resolve(dataDir, "encryption.key");
    try {
      encryptionKey = (await readFile(keyPath, "utf8")).trim();
    } catch {
      encryptionKey = randomBytes(32).toString("hex");
      await writeFile(keyPath, encryptionKey, { mode: 0o600, flag: "wx" });
    }
  }
  if (!/^[a-f\d]{64}$/i.test(encryptionKey))
    throw new Error(
      "ENCRYPTION_KEY must contain 32 random bytes encoded as 64 hex characters.",
    );
  const appUrl = (env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
  const publicUrl = (
    env.API_PUBLIC_URL || (production ? appUrl : "http://localhost:3001")
  ).replace(/\/$/, "");
  if (
    production &&
    (!env.DATABASE_URL ||
      !appUrl.startsWith("https://") ||
      !publicUrl.startsWith("https://"))
  )
    throw new Error(
      "Production requires DATABASE_URL and HTTPS APP_URL/API_PUBLIC_URL.",
    );
  return {
    production,
    dataDir,
    encryptionKey,
    appUrl,
    publicUrl,
    port: Number(env.PORT || 3001),
    databaseUrl: env.DATABASE_URL || undefined,
    databaseSsl: env.DATABASE_SSL === "true",
    openaiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL || "gpt-4.1-mini",
    openaiBaseUrl: env.OPENAI_BASE_URL || undefined,
    aiTimeout: Number(env.AI_TIMEOUT_MS || 8000),
    // Default 2: one inbound message can need two model calls, and a burst of
    // parallel calls is the fastest way to hit a provider rate limit. Raise it
    // only after the load lab shows p99 still under AI_TIMEOUT_MS.
    workerConcurrency: Math.max(
      1,
      Math.min(16, Number(env.WORKER_CONCURRENCY || 2)),
    ),
    workerKinds: (env.WORKER_KINDS || "")
      .split(",")
      .map((kind) => kind.trim())
      .filter(Boolean),
    workerEnabled: env.WORKER_ENABLED !== "false",
    graphVersion: env.META_GRAPH_VERSION || "v26.0",
    metaAppId: env.META_APP_ID,
    metaSecret: env.META_APP_SECRET,
    instagramAppId: env.INSTAGRAM_APP_ID,
    instagramSecret: env.INSTAGRAM_APP_SECRET,
    verifyToken: env.META_WEBHOOK_VERIFY_TOKEN,
    stripeKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    prices: {
      starter_monthly: env.STRIPE_STARTER_MONTHLY_PRICE,
      starter_yearly: env.STRIPE_STARTER_YEARLY_PRICE,
      growth_monthly: env.STRIPE_GROWTH_MONTHLY_PRICE,
      growth_yearly: env.STRIPE_GROWTH_YEARLY_PRICE,
    },
    smtpHost: env.SMTP_HOST,
    smtpPort: Number(env.SMTP_PORT || 587),
    smtpUser: env.SMTP_USER,
    smtpPassword: env.SMTP_PASSWORD,
    mailFrom: env.MAIL_FROM || "DMCloser <hello@example.com>",
    mailProvider: env.MAIL_PROVIDER || undefined,
    resendKey: env.RESEND_API_KEY || undefined,
    trustProxy: Number(env.TRUST_PROXY_HOPS || 0),
    metricsToken: env.METRICS_TOKEN,
    sentryDsn: env.SENTRY_DSN || undefined,
    sentryRelease: env.SENTRY_RELEASE || env.COMMIT_SHA || env.GIT_SHA || undefined,
    rateLimitMax: parseRateLimit("RATE_LIMIT_MAX", env.RATE_LIMIT_MAX, 300, production),
    authRateLimitMax: parseRateLimit("AUTH_RATE_LIMIT_MAX", env.AUTH_RATE_LIMIT_MAX, 15, production),
    recoveryRateLimitMax: parseRateLimit("RECOVERY_RATE_LIMIT_MAX", env.RECOVERY_RATE_LIMIT_MAX, 5, production),
  };
}

function parseRateLimit(
  name: string,
  raw: string | undefined,
  defaultValue: number,
  production: boolean,
): number {
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }
  const str = raw.trim();
  const val = Number(str);
  if (!/^\d+$/.test(str) || !Number.isInteger(val) || val < 1 || val > 100000) {
    if (production) {
      throw new Error(`${name} must be an integer between 1 and 100000.`);
    }
    return defaultValue;
  }
  return val;
}
