import { test } from "node:test";
import assert from "node:assert/strict";
import type { Config } from "../config.ts";
import {
  ResendProvider,
  SinkMailer,
  isTransientMailError,
  sendEmail,
} from "../mail.ts";
import { renderMail } from "../mail-templates.ts";

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

    // A payload queued before this deploy has no link; keep its original text.
    await sendEmail(sink, config, {
      to: "owner@example.com",
      subject: "Legacy",
      text: `Legacy link: ${link}`,
      purpose: "verify",
    });
    assert.equal(sink.sent[1].text, `Legacy link: ${link}`);
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

test("mail rendering escapes action links and rejects unsafe URL schemes", async () => {
  const escaped = await renderMail({
    purpose: "verify",
    link: 'https://app.example.com/action?x="<script>&y=1',
  });
  assert.match(escaped.html, /%22%3Cscript%3E&amp;y=1/);
  assert.doesNotMatch(escaped.html, /<script>/);

  const unsafe = await renderMail({ purpose: "verify", link: "javascript:alert(1)" });
  assert.doesNotMatch(unsafe.html, /href=/);
  assert.doesNotMatch(unsafe.text, /javascript:/);
});

test("the Resend adapter sends the expected payload and maps HTTP status", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const resend = new ResendProvider("test-key", "from@example.com", async (url, init) => {
    calls.push({ url: String(url), init: init! });
    return new Response(null, { status: 200 });
  });
  const message = {
    to: "owner@example.com",
    subject: "Verify",
    text: "plain",
    html: "<p>rich</p>",
    purpose: "verify",
    link,
  };
  await resend.send(message);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  assert.equal(JSON.parse(String(calls[0].init.body)).to, message.to);

  for (const [status, transient] of [
    [429, true],
    [500, true],
    [503, true],
    [401, false],
    [400, false],
  ] as const) {
    const failing = new ResendProvider(
      "test-key",
      "from@example.com",
      async () => new Response(null, { status }),
    );
    const error = await failing.send(message).catch((value) => value);
    assert.equal(isTransientMailError(error), transient, String(status));
  }
});
