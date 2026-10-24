import { test } from "node:test";
import assert from "node:assert/strict";
import { isTransientMailError } from "../mail.ts";

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
