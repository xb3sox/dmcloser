import { test } from "node:test";
import assert from "node:assert/strict";
import { equal, hashPassword, verifyPassword, encrypt, decrypt } from "../security.ts";

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

test("verifyPassword handles valid, invalid, and malformed stored hashes", async () => {
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);

  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("WrongPassword123!", hash), false);
  assert.equal(await verifyPassword(password, "malformed_hash_without_colon"), false);
  assert.equal(await verifyPassword(password, ""), false);
  assert.equal(await verifyPassword(password, ":"), false);
});

test("encrypt and decrypt roundtrip successfully", () => {
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const token = "my-secret-access-token";
  const cipher = encrypt(token, secret);
  assert.equal(decrypt(cipher, secret), token);
});

test("decrypt throws expected error on malformed or empty ciphertext", () => {
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  assert.throws(() => decrypt("", secret), { message: "Invalid encrypted payload." });
  assert.throws(() => decrypt("invalid", secret), { message: "Invalid encrypted payload format." });
  assert.throws(() => decrypt("iv.tag", secret), { message: "Invalid encrypted payload format." });
  assert.throws(() => decrypt("iv..body", secret), { message: "Invalid encrypted payload format." });
  assert.throws(() => decrypt("shortiv.shorttag.00", secret), { message: "Invalid encrypted payload format." });
  assert.throws(() => decrypt("zzzzzzzzzzzzzzzzzzzzzzzz.00000000000000000000000000000000.00", secret), {
    message: "Invalid encrypted payload format.",
  });
});
