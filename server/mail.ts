import nodemailer from "nodemailer";
import type { Config } from "./config.ts";

/** A queued outbound message. Kept plain so it survives a round trip through jsonb. */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Short label for logs and the activity feed: verify, reset, invite. */
  purpose: string;
};

/** SMTP transport, or null when mail is not configured at all. */
export function createMailer(config: Config) {
  if (!config.smtpHost) return null;
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: config.production,
    auth: config.smtpUser
      ? { user: config.smtpUser, pass: config.smtpPassword }
      : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
}

export type Mailer = NonNullable<ReturnType<typeof createMailer>>;

/**
 * Whether an SMTP failure is worth another attempt.
 *
 * Connection and greeting failures, timeouts and 4xx replies are transient — the
 * provider is busy or unreachable. 5xx replies and auth failures will fail the same
 * way forever, so retrying only delays the operator's alarm.
 */
export function isTransientMailError(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const value = error as { code?: string; responseCode?: number };
  // Rejected credentials and a refused envelope never heal on retry.
  if (value.code === "EAUTH" || value.code === "EENVELOPE") return false;
  if (typeof value.responseCode === "number")
    return value.responseCode >= 400 && value.responseCode < 500;
  return true;
}

export async function sendEmail(
  mailer: Mailer,
  config: Config,
  message: MailMessage,
): Promise<void> {
  await mailer.sendMail({
    from: config.mailFrom,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}
