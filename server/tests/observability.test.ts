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
    user: {
      id: "u123",
      ip_address: "192.168.1.1",
      email: "owner@company.com",
    },
    request: {
      url: "http://localhost:3001/api/conversations/c1/messages?token=secret123&user=admin",
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
        apiKey: "sk-proj-1234567890abcdef",
        api_key: "sk-proj-abcdef1234567890",
        secretKey: "sec-key-123456",
        private_key: "-----BEGIN PRIVATE KEY-----",
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
      arabicPhone: "رقم الهاتف هو +٩٦٦٥١٢٣٤٥٦٧٨ للتواصل",
    },
    breadcrumbs: [
      {
        category: "http",
        message:
          "POST /api/messages text='Hello world' email=support@company.org phone=+15551112222",
      },
    ],
  };

  const scrubbed = scrubSentryEvent(payload as any);

  // Check Authorization header & cookie scrubbed
  assert.equal(scrubbed.request?.headers?.authorization, "[SCRUBBED]");
  assert.equal(scrubbed.request?.headers?.cookie, "[SCRUBBED]");
  assert.equal(scrubbed.request?.headers?.["content-type"], "application/json");

  // Check email scrubbing
  assert.ok(!JSON.stringify(scrubbed).includes("user@domain.com"));
  assert.ok(!JSON.stringify(scrubbed).includes("customer@company.org"));
  assert.ok(!JSON.stringify(scrubbed).includes("support@company.org"));
  assert.ok(!JSON.stringify(scrubbed).includes("owner@company.com"));

  // Check phone scrubbing (both ASCII and Arabic-Indic digits)
  assert.ok(!JSON.stringify(scrubbed).includes("+15551234567"));
  assert.ok(!JSON.stringify(scrubbed).includes("+15559876543"));
  assert.ok(!JSON.stringify(scrubbed).includes("+15551112222"));
  assert.ok(!JSON.stringify(scrubbed).includes("+٩٦٦٥١٢٣٤٥٦٧٨"));

  // Check user IP & email
  assert.equal((scrubbed as any).user?.ip_address, "[SCRUBBED_IP]");
  assert.equal((scrubbed as any).user?.email, "[SCRUBBED_EMAIL]");
  assert.equal((scrubbed as any).user?.id, "u123");

  // Check message body scrubbing
  assert.equal((scrubbed.request?.data as any)?.text, "[SCRUBBED_BODY]");
  assert.equal((scrubbed.request?.data as any)?.notes, "[SCRUBBED_BODY]");
  assert.equal((scrubbed.extra as any)?.messageBody, "[SCRUBBED_BODY]");

  // Check token and API key scrubbing
  assert.equal((scrubbed.request?.data as any)?.token, "[SCRUBBED]");
  assert.equal((scrubbed.request?.data as any)?.apiKey, "[SCRUBBED]");
  assert.equal((scrubbed.request?.data as any)?.api_key, "[SCRUBBED]");
  assert.equal((scrubbed.request?.data as any)?.secretKey, "[SCRUBBED]");
  assert.equal((scrubbed.request?.data as any)?.private_key, "[SCRUBBED]");

  // Non-sensitive request fields preserved and query params scrubbed
  assert.equal(scrubbed.event_id, "test-event-123");
  assert.equal(scrubbed.request?.method, "POST");
  assert.equal(
    scrubbed.request?.url,
    "http://localhost:3001/api/conversations/c1/messages?[SCRUBBED_QUERY]",
  );
});

test("observability: circular object does not crash scrubber", () => {
  const circularObj: any = { name: "test", email: "circ@example.com" };
  circularObj.self = circularObj;

  const result: any = scrubSentryEvent(circularObj);
  assert.equal(result.self, "[Circular]");
  assert.equal(result.email, "[SCRUBBED_EMAIL]");
});
