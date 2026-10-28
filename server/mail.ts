import nodemailer, { type Transporter } from "nodemailer";
import type { Config } from "./config.ts";
import { renderMail } from "./mail-templates.tsx";

/** A queued outbound message. Kept plain so it survives a round trip through jsonb. */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Short label for logs and the activity feed: verify, reset, invite, delivery-failure. */
  purpose: string;
  /** Single-use action URL rendered into the HTML and text bodies. */
  link?: string;
};

export type OutboundMail = MailMessage & { html: string; text: string };

/**
 * The only surface the queue and worker use. SMTP is the default; Resend is the
 * one HTTP adapter; the sink is for tests and never opens a socket.
 */
export interface MailProvider {
  send(message: OutboundMail): Promise<void>;
}

export type Mailer = MailProvider;

class SmtpProvider implements MailProvider {
  constructor(
    private transport: Transporter,
    private from: string,
  ) {}

  async send(message: OutboundMail) {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

class ResendProvider implements MailProvider {
  constructor(
    private key: string,
    private from: string,
    private fetcher: typeof fetch = fetch,
  ) {}

  async send(message: OutboundMail) {
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = new Error(
        `Resend rejected the message with status ${response.status}.`,
      ) as Error & { responseCode?: number };
      error.responseCode = response.status;
      throw error;
    }
  }
}

/** Captures rendered messages in memory. No network, no credentials. */
export class SinkMailer implements MailProvider {
  sent: OutboundMail[] = [];
  async send(message: OutboundMail) {
    this.sent.push(message);
  }
}

/**
 * SMTP is the default. `MAIL_PROVIDER=resend` uses the HTTP adapter and
 * `MAIL_PROVIDER=sink` is for tests. Null means email is not configured at all.
 */
export function createMailer(config: Config): Mailer | null {
  const kind =
    config.mailProvider ||
    (config.smtpHost ? "smtp" : config.resendKey ? "resend" : undefined);
  if (kind === "sink") return new SinkMailer();
  if (kind === "resend" && config.resendKey)
    return new ResendProvider(config.resendKey, config.mailFrom);
  if (kind === "smtp" && config.smtpHost)
    return new SmtpProvider(
      nodemailer.createTransport({
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
      }),
      config.mailFrom,
    );
  return null;
}

/**
 * Whether an SMTP or HTTP failure is worth another attempt.
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
  _config: Config,
  message: MailMessage,
): Promise<void> {
  const rendered = await renderMail({
    purpose: message.purpose,
    link: message.link,
  });
  await mailer.send({ ...message, ...rendered });
}
