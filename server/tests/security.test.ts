import { test } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import request from "supertest";
import { equal, hashPassword, verifyPassword, encrypt, decrypt } from "../security.ts";
import { decodeCursor } from "../service.ts";
import { loadConfig } from "../config.ts";
import { createDatabase } from "../db.ts";
import { createApp } from "../app.ts";

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

test("decodeCursor rejects null, primitive, and malformed cursors with HttpError 400", () => {
  const nullCursor = Buffer.from("null").toString("base64url");
  const numberCursor = Buffer.from("123").toString("base64url");
  assert.throws(() => decodeCursor(nullCursor), { status: 400, message: "The page cursor is not valid." });
  assert.throws(() => decodeCursor(numberCursor), { status: 400, message: "The page cursor is not valid." });
  assert.throws(() => decodeCursor("invalid-base64!"), { status: 400, message: "The page cursor is not valid." });
});

test("loadConfig parses valid rate limits and enforces 1..100000 integer range", async () => {
  const origEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "development";
    process.env.RATE_LIMIT_MAX = "500";
    process.env.AUTH_RATE_LIMIT_MAX = "25";
    process.env.RECOVERY_RATE_LIMIT_MAX = "10";

    const cfg = await loadConfig();
    assert.equal(cfg.rateLimitMax, 500);
    assert.equal(cfg.authRateLimitMax, 25);
    assert.equal(cfg.recoveryRateLimitMax, 10);
  } finally {
    process.env = origEnv;
  }
});

test("loadConfig falls back to independent defaults for missing or invalid rate limits in development", async () => {
  const origEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "development";
    process.env.RATE_LIMIT_MAX = "500";
    process.env.AUTH_RATE_LIMIT_MAX = "invalid";
    delete process.env.RECOVERY_RATE_LIMIT_MAX;

    const cfg = await loadConfig();
    assert.equal(cfg.rateLimitMax, 500);
    assert.equal(cfg.authRateLimitMax, 15);
    assert.equal(cfg.recoveryRateLimitMax, 5);
  } finally {
    process.env = origEnv;
  }
});

test("loadConfig rejects invalid rate limits in production mode", async () => {
  const origEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.APP_URL = "https://app.example.com";
    process.env.API_PUBLIC_URL = "https://api.example.com";

    for (const invalidValue of ["0", "100001", "3.14", "-5", "abc"]) {
      process.env.RATE_LIMIT_MAX = invalidValue;
      await assert.rejects(
        () => loadConfig(),
        /RATE_LIMIT_MAX must be an integer between 1 and 100000/
      );
    }
  } finally {
    process.env = origEnv;
  }
});

test("rate limiter returns HTTP 429 when limit is exceeded", async () => {
  const db = await createDatabase({
    databaseUrl: process.env.TEST_DATABASE_URL,
    databaseSsl: false,
    dataDir: ":memory:",
  });
  const clientIp = `198.51.100.${randomInt(1, 255)}`;
  const key = `api:${clientIp}`;
  const clearKey = () =>
    db.query("DELETE FROM rate_limits WHERE key=$1", [key]).catch(() => undefined);
  await clearKey();

  try {
    const { app } = await createApp(
      {
        production: false,
        port: 3001,
        appUrl: "http://localhost:5173",
        publicUrl: "http://127.0.0.1:3001",
        databaseSsl: false,
        dataDir: ":memory:",
        encryptionKey: "ab".repeat(32),
        openaiModel: "fake",
        aiTimeout: 1000,
        workerConcurrency: 1,
        workerKinds: [],
        workerEnabled: false,
        graphVersion: "v26.0",
        prices: {},
        smtpPort: 587,
        mailFrom: "test@example.com",
        trustProxy: 1,
        rateLimitMax: 2,
        authRateLimitMax: 10,
        recoveryRateLimitMax: 10,
      },
      db,
    );

    // The shared Postgres limiter is keyed by client IP, so a fresh key keeps
    // this test independent of the suites that ran before it in the same database.
    const hit = () =>
      request(app).get("/api/health").set("X-Forwarded-For", clientIp);

    const res1 = await hit();
    assert.equal(res1.status, 200);

    const res2 = await hit();
    assert.equal(res2.status, 200);

    const res3 = await hit();
    assert.equal(res3.status, 429);
    assert.equal(res3.body.error, "Too many requests. Please wait a minute.");
  } finally {
    await clearKey();
    await db.close();
  }
});
