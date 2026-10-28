import { test } from "node:test";
import assert from "node:assert/strict";
import type { Config } from "../config.ts";
import {
  SinkMailer,
  createMailer,
  isTransientMailError,
  sendEmail,
  type MailProvider,
} from "../mail.ts";
import { renderMail } from "../mail-templates.tsx";

const config = { mailFrom: "test@example.com" } as Config;
const link = "https://app.example.com/workspace?verify=token";

// Retrying is only useful when the failure could plausibly clear on its own.
// These four cases are the ones that decide whether a clinic gets its invitation
// on the first try or after a provider hiccup.

test("transient mail failures are retried and permanent ones are not", () => {
  assert.equal(isTransientMailError({ responseCode: 451 }), true);
  assert.equal(isTransientMailError({ responseCode: 421 }), true);
  assert.equal(isTransientMailError({ responseCode: 550 }), false);
  assert.equal(isTransientMailError({ responseCode: 554 }), false);
  assert.equal(isTransientMailError({ code: "ECONNECTION" }), true);
  assert.equal(isTransientMailError({ code: "ETIMEDOUT" }), true);
  assert.equal(isTransientMailError({ code: "EAUTH" }), false);
  assert.equal(isTransientMailError({ code: "EENVELOPE" }), false);
  assert.equal(isTransientMailError(new Error("unknown")), true);
  assert.equal(isTransientMailError(null), true);
});

test("the sink provider renders HTML and text without a network call", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("network access is forbidden in this test");
  }) as typeof fetch;
  try {
    const sink = new SinkMailer();
    await sendEmail(sink, config, {
      to: "owner@example.com",
      subject: "Verify your DMCloser email",
      text: "",
      purpose: "verify",
      link,
    });
    assert.equal(sink.sent.length, 1);
    assert.match(sink.sent[0].html, /Verify your DMCloser email/);
    assert.match(sink.sent[0].html, /app\.example\.com/);
    assert.match(sink.sent[0].text, /app\.example\.com/);
    assert.match(sink.sent[0].text, /Verify email/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("every template renders the link and a plain-text alternative", async () => {
  for (const purpose of ["verify", "reset", "invite"]) {
    const rendered = await renderMail({ purpose, link });
    assert.match(rendered.html, /app\.example\.com/, purpose);
    assert.match(rendered.text, /app\.example\.com/, purpose);
    assert.ok(rendered.html.length > 100, purpose);
  }
  const failure = await renderMail({ purpose: "delivery-failure" });
  assert.match(failure.html, /could not be delivered/);
  assert.match(failure.text, /Activity/);
});

test("provider selection is configuration only and a failure stays retryable", async () => {
  const sink = createMailer({ ...config, mailProvider: "sink" });
  assert.ok(sink instanceof SinkMailer);

  const failing: MailProvider = {
    async send() {
      const error = new Error("provider busy") as Error & {
        responseCode?: number;
      };
      error.responseCode = 451;
      throw error;
    },
  };
  await assert.rejects(() =>
    sendEmail(failing, config, {
      to: "owner@example.com",
      subject: "Reset",
      text: "",
      purpose: "reset",
      link,
    }),
  );
});
