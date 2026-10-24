import nodemailer from "nodemailer";
import type { Config } from "./config.ts";

/** A queued outbound message. Kept plain so it survives a round trip through jsonb. */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Short label for logs and the activity feed: verify, reset, invite, delivery_failure. */
  purpose: string;
};

export interface EmailSendOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose: string;
}

export interface EmailProvider {
  readonly name: string;
  send(options: EmailSendOptions): Promise<void>;
}

export class SmtpProvider implements EmailProvider {
  readonly name = "smtp";
  private transport: ReturnType<typeof nodemailer.createTransport>;

  constructor(config: Config) {
    this.transport = nodemailer.createTransport({
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

  async send(options: EmailSendOptions): Promise<void> {
    await this.transport.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}

export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private apiKey: string;
  private fetcher: typeof fetch;

  constructor(apiKey: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  async send(options: EmailSendOptions): Promise<void> {
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const error: any = new Error(`Resend API error (${response.status}): ${errText}`);
      error.status = response.status;
      error.isHttp = true;
      throw error;
    }
  }
}

export class PostmarkProvider implements EmailProvider {
  readonly name = "postmark";
  private serverToken: string;
  private fetcher: typeof fetch;

  constructor(serverToken: string, fetcher: typeof fetch = fetch) {
    this.serverToken = serverToken;
    this.fetcher = fetcher;
  }

  async send(options: EmailSendOptions): Promise<void> {
    const response = await this.fetcher("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": this.serverToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        From: options.from,
        To: options.to,
        Subject: options.subject,
        TextBody: options.text,
        HtmlBody: options.html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const error: any = new Error(`Postmark API error (${response.status}): ${errText}`);
      error.status = response.status;
      error.isHttp = true;
      throw error;
    }
  }
}

export class SinkProvider implements EmailProvider {
  readonly name = "sink";
  readonly sent: EmailSendOptions[] = [];

  async send(options: EmailSendOptions): Promise<void> {
    this.sent.push({ ...options });
  }

  clear(): void {
    this.sent.length = 0;
  }
}

/** Legacy type export compatibility if needed, or Mailer as EmailProvider. */
export type Mailer = EmailProvider;

/** Factory function to create an EmailProvider based on config. */
export function createMailer(config: Config): EmailProvider | null {
  switch (config.mailProvider) {
    case "sink":
      return new SinkProvider();
    case "smtp":
      return config.smtpHost ? new SmtpProvider(config) : null;
    case "resend":
      return config.resendApiKey ? new ResendProvider(config.resendApiKey) : null;
    case "postmark":
      return config.postmarkServerToken
        ? new PostmarkProvider(config.postmarkServerToken)
        : null;
    case "none":
    default:
      return null;
  }
}

/**
 * Whether a mail failure is worth another attempt.
 *
 * Connection and greeting failures, timeouts and 4xx replies are transient — the
 * provider is busy or unreachable. 5xx replies, 401/403 auth failures, and invalid credentials will fail the same
 * way forever, so retrying only delays the operator's alarm.
 */
export function isTransientMailError(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const value = error as {
    code?: string;
    responseCode?: number;
    status?: number;
    isHttp?: boolean;
  };
  if (value.code === "EAUTH" || value.code === "EENVELOPE") return false;

  if (value.isHttp) {
    const status = value.status ?? value.responseCode;
    if (typeof status === "number") {
      if (status === 429) return true;
      if (status >= 500) return true;
      if (status >= 400 && status < 500) return false;
    }
    return true;
  }

  if (typeof value.responseCode === "number") {
    if (value.responseCode >= 400 && value.responseCode < 500) return true;
    if (value.responseCode >= 500) return false;
  }
  return true;
}

export async function sendEmail(
  provider: EmailProvider,
  config: Config,
  message: MailMessage,
): Promise<void> {
  await provider.send({
    from: config.mailFrom,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    purpose: message.purpose,
  });
}
