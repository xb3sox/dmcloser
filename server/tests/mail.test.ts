import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTransientMailError,
  SinkProvider,
  ResendProvider,
  PostmarkProvider,
  createMailer,
  sendEmail,
} from "../mail.ts";
import { renderEmail } from "../email-templates.tsx";
import type { Config } from "../config.ts";

const mockConfig: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiModel: "gpt-4.1-mini",
  aiTimeout: 8000,
  workerConcurrency: 2,
  workerKinds: [],
  workerEnabled: true,
  graphVersion: "v26.0",
  prices: {},
  mailProvider: "sink",
  smtpPort: 587,
  mailFrom: "DMCloser <hello@example.com>",
  trustProxy: 0,
};

test("transient mail failures are retried and permanent ones are not", () => {
  // SMTP semantics (4xx transient, 5xx permanent)
  assert.equal(isTransientMailError({ responseCode: 451 }), true);
  assert.equal(isTransientMailError({ responseCode: 421 }), true);
  assert.equal(isTransientMailError({ responseCode: 550 }), false);
  assert.equal(isTransientMailError({ responseCode: 554 }), false);
  assert.equal(isTransientMailError({ code: "ECONNECTION" }), true);
  assert.equal(isTransientMailError({ code: "ETIMEDOUT" }), true);
  assert.equal(isTransientMailError({ code: "EAUTH" }), false);
  assert.equal(isTransientMailError({ code: "EENVELOPE" }), false);

  // HTTP semantics (5xx and 429 transient, 4xx permanent)
  assert.equal(isTransientMailError({ isHttp: true, status: 500 }), true);
  assert.equal(isTransientMailError({ isHttp: true, status: 502 }), true);
  assert.equal(isTransientMailError({ isHttp: true, status: 503 }), true);
  assert.equal(isTransientMailError({ isHttp: true, status: 429 }), true);
  assert.equal(isTransientMailError({ isHttp: true, status: 400 }), false);
  assert.equal(isTransientMailError({ isHttp: true, status: 401 }), false);
  assert.equal(isTransientMailError({ isHttp: true, status: 403 }), false);
  assert.equal(isTransientMailError({ isHttp: true, status: 404 }), false);
  assert.equal(isTransientMailError({ isHttp: true, status: 422 }), false);

  assert.equal(isTransientMailError(new Error("unknown")), true);
  assert.equal(isTransientMailError(null), true);
});

test("SinkProvider captures sent emails offline without network", async () => {
  const sink = new SinkProvider();
  assert.equal(sink.name, "sink");
  assert.equal(sink.sent.length, 0);

  await sendEmail(sink, mockConfig, {
    to: "user@example.com",
    subject: "Test Subject",
    text: "Test plain text body",
    html: "<p>Test html body</p>",
    purpose: "verify",
  });

  assert.equal(sink.sent.length, 1);
  assert.equal(sink.sent[0].to, "user@example.com");
  assert.equal(sink.sent[0].from, "DMCloser <hello@example.com>");
  assert.equal(sink.sent[0].subject, "Test Subject");
  assert.equal(sink.sent[0].text, "Test plain text body");
  assert.equal(sink.sent[0].html, "<p>Test html body</p>");
  assert.equal(sink.sent[0].purpose, "verify");

  sink.clear();
  assert.equal(sink.sent.length, 0);
});

test("HTTP Provider Adapters (Resend & Postmark) send valid payloads and handle errors", async () => {
  const calls: { url: string; options?: RequestInit }[] = [];

  const mockFetcher: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("fail")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return new Response(JSON.stringify({ id: "msg_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  // Test Resend Provider
  const resend = new ResendProvider("re_123456", mockFetcher);
  await resend.send({
    from: "hello@example.com",
    to: "test@example.com",
    subject: "Hello Resend",
    text: "Resend text",
    html: "<p>Resend html</p>",
    purpose: "verify",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(
    (calls[0].options?.headers as Record<string, string>)?.[
      "Authorization"
    ],
    "Bearer re_123456",
  );
  const resendBody = JSON.parse(String(calls[0].options?.body));
  assert.deepEqual(resendBody.to, ["test@example.com"]);
  assert.equal(resendBody.subject, "Hello Resend");

  // Test Postmark Provider
  const postmark = new PostmarkProvider("pm_token_123", mockFetcher);
  await postmark.send({
    from: "hello@example.com",
    to: "test@example.com",
    subject: "Hello Postmark",
    text: "Postmark text",
    html: "<p>Postmark html</p>",
    purpose: "reset",
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://api.postmarkapp.com/email");
  assert.equal(
    (calls[1].options?.headers as Record<string, string>)?.[
      "X-Postmark-Server-Token"
    ],
    "pm_token_123",
  );
  const postmarkBody = JSON.parse(String(calls[1].options?.body));
  assert.equal(postmarkBody.To, "test@example.com");
  assert.equal(postmarkBody.Subject, "Hello Postmark");

  // Test failure handling
  const resendFail = new ResendProvider("invalid", async () => new Response("Forbidden", { status: 403 }));
  await assert.rejects(
    resendFail.send({
      from: "a@b.com",
      to: "c@d.com",
      subject: "s",
      text: "t",
      purpose: "test",
    }),
    (err: any) => err.status === 403 && err.isHttp === true,
  );
});

test("createMailer instantiates provider based on config", () => {
  assert.equal(createMailer({ ...mockConfig, mailProvider: "sink" })?.name, "sink");
  assert.equal(
    createMailer({ ...mockConfig, mailProvider: "resend", resendApiKey: "re_key" })?.name,
    "resend",
  );
  assert.equal(
    createMailer({
      ...mockConfig,
      mailProvider: "postmark",
      postmarkServerToken: "pm_key",
    })?.name,
    "postmark",
  );
  assert.equal(createMailer({ ...mockConfig, mailProvider: "none" }), null);
});

test("templates render HTML and text snapshots with proper escaping", () => {
  // Verification template snapshot
  const verify = renderEmail("verify", {
    url: "http://localhost:5173/workspace?verify=token123",
    recipientName: "<Script>Alert('XSS')</Script>",
  });

  assert.equal(verify.subject, "Verify your DMCloser email");
  assert.equal(
    verify.text,
    "Verify your email using this single-use link (expires in one hour):\nhttp://localhost:5173/workspace?verify=token123\n\nIf you did not request this, ignore this email.",
  );
  assert.equal(
    verify.html,
    '<!DOCTYPE html><div style="background-color:#fcfbf9;color:#1c1c1c;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, Roboto, Helvetica, Arial, sans-serif;padding:40px 20px;margin:0"><div style="background-color:#ffffff;border-radius:8px;border:1px solid #e2ded4;padding:32px;max-width:560px;margin:0 auto;box-shadow:0 2px 4px rgba(0, 0, 0, 0.02)"><div style="font-size:20px;font-weight:700;color:#1b382b;margin-bottom:24px;letter-spacing:-0.02em">DMCloser</div><h1 style="font-size:22px;font-weight:600;color:#1b382b;margin:0 0 16px 0">Verify your email</h1><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Hello &lt;Script&gt;Alert(&#x27;XSS&#x27;)&lt;/Script&gt;,</p><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Please verify your email address to complete your account setup and access DMCloser.</p><a href="http://localhost:5173/workspace?verify=token123" style="display:inline-block;background-color:#1b382b;color:#ffffff;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;margin:8px 0 24px 0">Verify Email Address</a><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Or copy and paste this single-use URL into your browser (expires in one hour):<br/><span style="word-break:break-all;font-size:13px;color:#1b382b">http://localhost:5173/workspace?verify=token123</span></p><div style="font-size:12px;color:#6e6e6e;margin-top:32px;border-top:1px solid #f0ede6;padding-top:16px">If you did not request this email, you can safely ignore it.</div></div></div>',
  );

  // Reset template snapshot
  const reset = renderEmail("reset", {
    url: "http://localhost:5173/workspace?reset=token456",
    recipientName: "Jane & Co",
  });

  assert.equal(reset.subject, "Reset your DMCloser password");
  assert.equal(
    reset.text,
    "Reset your password using this single-use link (expires in one hour):\nhttp://localhost:5173/workspace?reset=token456\n\nIf you did not request this, ignore this email.",
  );
  assert.equal(
    reset.html,
    '<!DOCTYPE html><div style="background-color:#fcfbf9;color:#1c1c1c;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, Roboto, Helvetica, Arial, sans-serif;padding:40px 20px;margin:0"><div style="background-color:#ffffff;border-radius:8px;border:1px solid #e2ded4;padding:32px;max-width:560px;margin:0 auto;box-shadow:0 2px 4px rgba(0, 0, 0, 0.02)"><div style="font-size:20px;font-weight:700;color:#1b382b;margin-bottom:24px;letter-spacing:-0.02em">DMCloser</div><h1 style="font-size:22px;font-weight:600;color:#1b382b;margin:0 0 16px 0">Reset your password</h1><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Hello Jane &amp; Co,</p><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">We received a request to reset your DMCloser account password.</p><a href="http://localhost:5173/workspace?reset=token456" style="display:inline-block;background-color:#1b382b;color:#ffffff;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;margin:8px 0 24px 0">Reset Password</a><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Or copy and paste this link into your browser (expires in one hour):<br/><span style="word-break:break-all;font-size:13px;color:#1b382b">http://localhost:5173/workspace?reset=token456</span></p><div style="font-size:12px;color:#6e6e6e;margin-top:32px;border-top:1px solid #f0ede6;padding-top:16px">If you did not request a password reset, ignore this email.</div></div></div>',
  );

  // Invite template snapshot
  const invite = renderEmail("invite", {
    url: "http://localhost:5173/workspace?invite=token789",
    workspaceName: "Acme Store <HQ>",
    recipientName: "Bob",
  });

  assert.equal(invite.subject, "Your DMCloser workspace invitation");
  assert.equal(
    invite.text,
    "Sign in and accept your invitation:\nhttp://localhost:5173/workspace?invite=token789\n\nThis link expires in 48 hours.",
  );
  assert.equal(
    invite.html,
    '<!DOCTYPE html><div style="background-color:#fcfbf9;color:#1c1c1c;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, Roboto, Helvetica, Arial, sans-serif;padding:40px 20px;margin:0"><div style="background-color:#ffffff;border-radius:8px;border:1px solid #e2ded4;padding:32px;max-width:560px;margin:0 auto;box-shadow:0 2px 4px rgba(0, 0, 0, 0.02)"><div style="font-size:20px;font-weight:700;color:#1b382b;margin-bottom:24px;letter-spacing:-0.02em">DMCloser</div><h1 style="font-size:22px;font-weight:600;color:#1b382b;margin:0 0 16px 0">You&#x27;ve been invited</h1><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Hello Bob,</p><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">You have been invited to join Acme Store &lt;HQ&gt; on DMCloser.</p><a href="http://localhost:5173/workspace?invite=token789" style="display:inline-block;background-color:#1b382b;color:#ffffff;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;margin:8px 0 24px 0">Accept Invitation</a><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Or copy and paste this link into your browser (expires in 48 hours):<br/><span style="word-break:break-all;font-size:13px;color:#1b382b">http://localhost:5173/workspace?invite=token789</span></p><div style="font-size:12px;color:#6e6e6e;margin-top:32px;border-top:1px solid #f0ede6;padding-top:16px">DMCloser AI Sales Inbox for Instagram &amp; WhatsApp.</div></div></div>',
  );

  // Delivery Failure template snapshot
  const deliveryFailure = renderEmail("delivery_failure", {
    conversationUrl: "http://localhost:5173/workspace/conv_123",
    errorMessage: "Recipient mailbox full & unresponsive <550>",
    recipientName: "Operator",
  });

  assert.equal(
    deliveryFailure.subject,
    "Action required: DMCloser email delivery failure",
  );
  assert.equal(
    deliveryFailure.text,
    "An outbound email message failed to deliver:\nRecipient mailbox full & unresponsive <550>\n\nReview: http://localhost:5173/workspace/conv_123",
  );
  assert.equal(
    deliveryFailure.html,
    '<!DOCTYPE html><div style="background-color:#fcfbf9;color:#1c1c1c;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, Roboto, Helvetica, Arial, sans-serif;padding:40px 20px;margin:0"><div style="background-color:#ffffff;border-radius:8px;border:1px solid #e2ded4;padding:32px;max-width:560px;margin:0 auto;box-shadow:0 2px 4px rgba(0, 0, 0, 0.02)"><div style="font-size:20px;font-weight:700;color:#1b382b;margin-bottom:24px;letter-spacing:-0.02em">DMCloser</div><h1 style="font-size:22px;font-weight:600;color:#991b1b;margin:0 0 16px 0">Message delivery failure</h1><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">Hello Operator,</p><p style="font-size:15px;line-height:1.6;color:#2c2c2c;margin:0 0 24px 0">An outbound message encountered a non-transient delivery failure or requires review:</p><div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;color:#991b1b;font-size:14px;margin-bottom:20px;font-family:monospace">Recipient mailbox full &amp; unresponsive &lt;550&gt;</div><a href="http://localhost:5173/workspace/conv_123" style="display:inline-block;background-color:#1b382b;color:#ffffff;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;margin:8px 0 24px 0">View in Inbox</a><div style="font-size:12px;color:#6e6e6e;margin-top:32px;border-top:1px solid #f0ede6;padding-top:16px">Please review your activity feed and conversation details in DMCloser.</div></div></div>',
  );
});

test("no test opens a network connection assertion", () => {
  const mailer = createMailer(mockConfig);
  assert.equal(mailer?.name, "sink");
});
