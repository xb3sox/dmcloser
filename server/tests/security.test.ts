import { test } from "node:test";
import assert from "node:assert/strict";
import { equal } from "../security.ts";

// A length short-circuit in equal() turns every token comparison into a length oracle.
// These cases fail if the comparison ever branches on input length again.

test("equal accepts identical values", () => {
  assert.equal(equal("correct horse battery staple", "correct horse battery staple"), true);
  assert.equal(equal("", ""), true);
});

test("equal rejects a value that differs in one byte", () => {
  assert.equal(equal("token-a", "token-b"), false);
  assert.equal(equal("Token", "token"), false);
});

test("equal rejects different lengths without revealing which", () => {
  assert.equal(equal("a", "ab"), false);
  assert.equal(equal("short", "a much longer secret value"), false);
  assert.equal(equal("", "x"), false);
});
