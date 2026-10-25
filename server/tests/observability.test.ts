import test from "node:test";
import assert from "node:assert/strict";
import {
  scrubSentryEvent,
  initServerObservability,
} from "../observability.ts";

test("observability: init without DSN does not throw", () => {
  assert.doesNotThrow(() => {
    initServerObservability({});
  });
  assert.doesNotThrow(() => {
    initServerObservability({ sentryDsn: undefined });
  });
  assert.doesNotThrow(() => {
    initServerObservability({ sentryDsn: "" });
  });
});

test("observability: scrubber removes email, phone, message body and Authorization header", () => {
  const payload = {
    event_id: "test-event-123",
    message: "Unhandled error for customer user@domain.com calling +15551234567",
    request: {
      url: "http://localhost:3001/api/conversations/c1/messages",
      method: "POST",
      headers: {
        authorization: "Bearer secret-token-xyz",
        cookie: "dmcloser_session=abc123session",
        "content-type": "application/json",
      },
      data: {
        text: "I want to buy 2 items. My email is customer@company.org and phone is +15559876543.",
        email: "customer@company.org",
        phone: "+15559876543",
        token: "session-secret-token",
        notes: "Private customer note content",
      },
    },
    exception: {
      values: [
        {
          type: "Error",
          value: "Failed to send message to user@domain.com (+15551234567)",
        },
      ],
    },
    extra: {
      messageBody: "Raw message content from instagram customer",
      userEmail: "customer@company.org",
    },
    breadcrumbs: [
      {
        category: "http",
        message:
          "POST /api/messages text='Hello world' email=support@company.org phone=+15551112222",
      },
    ],
  };

  const scrubbed = scrubSentryEvent(payload);

  // Check Authorization header & cookie scrubbed
  assert.equal(scrubbed.request.headers.authorization, "[SCRUBBED]");
  assert.equal(scrubbed.request.headers.cookie, "[SCRUBBED]");
  assert.equal(scrubbed.request.headers["content-type"], "application/json");

  // Check email scrubbing
  assert.ok(!JSON.stringify(scrubbed).includes("user@domain.com"));
  assert.ok(!JSON.stringify(scrubbed).includes("customer@company.org"));
  assert.ok(!JSON.stringify(scrubbed).includes("support@company.org"));

  // Check phone scrubbing
  assert.ok(!JSON.stringify(scrubbed).includes("+15551234567"));
  assert.ok(!JSON.stringify(scrubbed).includes("+15559876543"));
  assert.ok(!JSON.stringify(scrubbed).includes("+15551112222"));

  // Check message body scrubbing
  assert.equal(scrubbed.request.data.text, "[SCRUBBED_BODY]");
  assert.equal(scrubbed.request.data.notes, "[SCRUBBED_BODY]");
  assert.equal(scrubbed.extra.messageBody, "[SCRUBBED_BODY]");

  // Check token scrubbing
  assert.equal(scrubbed.request.data.token, "[SCRUBBED]");

  // Non-sensitive request fields preserved
  assert.equal(scrubbed.event_id, "test-event-123");
  assert.equal(scrubbed.request.method, "POST");
  assert.equal(
    scrubbed.request.url,
    "http://localhost:3001/api/conversations/c1/messages",
  );
});
