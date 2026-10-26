import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createDatabase, type Database } from "../db.ts";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import type { Config } from "../config.ts";

const baseConfig: Config = {
  production: false,
  port: 3001,
  appUrl: "http://localhost:5173",
  publicUrl: "http://localhost:3001",
  databaseSsl: false,
  dataDir: ":memory:",
  encryptionKey: "ab".repeat(32),
  openaiKey: "test-only",
  openaiModel: "fake",
  aiTimeout: 1000,
  workerConcurrency: 1,
  workerKinds: [],
  workerEnabled: false,
  graphVersion: "v26.0",
  prices: {},
  smtpPort: 587,
  mailFrom: "test@example.com",
  trustProxy: 0,
  rateLimitMax: 10000,
  authRateLimitMax: 10000,
  recoveryRateLimitMax: 10000,
};

let db: Database;
before(async () => {
  db = await createDatabase({
    ...baseConfig,
    databaseUrl: process.env.TEST_DATABASE_URL,
  });
});
after(async () => {
  await db.close();
});

describe("rate limit config parsing", () => {
  const envKeys = ["RATE_LIMIT_MAX", "AUTH_RATE_LIMIT_MAX", "RECOVERY_RATE_LIMIT_MAX"] as const;

  async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
    const keys = [...new Set([...envKeys, ...Object.keys(vars), "NODE_ENV", "DATABASE_URL", "APP_URL", "API_PUBLIC_URL", "ENCRYPTION_KEY"])];
    const saved: Record<string, string | undefined> = {};
    for (const key of keys) saved[key] = process.env[key];
    try {
      for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      await fn();
    } finally {
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  }

  test("empty env falls back to defaults", async () => {
    await withEnv({ RATE_LIMIT_MAX: undefined, AUTH_RATE_LIMIT_MAX: undefined, RECOVERY_RATE_LIMIT_MAX: undefined }, async () => {
      const cfg = await loadConfig();
      assert.equal(cfg.rateLimitMax, 300);
      assert.equal(cfg.authRateLimitMax, 15);
      assert.equal(cfg.recoveryRateLimitMax, 5);
    });
  });

  test("valid integers are parsed", async () => {
    await withEnv({ RATE_LIMIT_MAX: "200", AUTH_RATE_LIMIT_MAX: "10", RECOVERY_RATE_LIMIT_MAX: "3" }, async () => {
      const cfg = await loadConfig();
      assert.equal(cfg.rateLimitMax, 200);
      assert.equal(cfg.authRateLimitMax, 10);
      assert.equal(cfg.recoveryRateLimitMax, 3);
    });
  });

  test("non-numeric, zero, negative, float, and numeric-separator fall back in non-production", async () => {
    for (const bad of ["abc", "0", "-5", "1.5", "10_000", "Infinity", "NaN"]) {
      await withEnv({ RATE_LIMIT_MAX: bad, AUTH_RATE_LIMIT_MAX: bad, RECOVERY_RATE_LIMIT_MAX: bad }, async () => {
        const cfg = await loadConfig();
        assert.equal(cfg.rateLimitMax, 300, `RATE_LIMIT_MAX=${bad} should fallback`);
        assert.equal(cfg.authRateLimitMax, 15, `AUTH_RATE_LIMIT_MAX=${bad} should fallback`);
        assert.equal(cfg.recoveryRateLimitMax, 5, `RECOVERY_RATE_LIMIT_MAX=${bad} should fallback`);
      });
    }
  });

  test("invalid values throw in production", async () => {
    await withEnv({ RATE_LIMIT_MAX: "abc" }, async () => {
      process.env.NODE_ENV = "production";
      // Need minimal prod env to not throw earlier: DATABASE_URL + HTTPS URLs + valid encryption key
      process.env.DATABASE_URL = "postgres://test:test@localhost/db";
      process.env.APP_URL = "https://example.com";
      process.env.API_PUBLIC_URL = "https://example.com";
      process.env.ENCRYPTION_KEY = "ab".repeat(32);
      await assert.rejects(() => loadConfig(), /RATE_LIMIT_MAX must be an integer/);
      delete process.env.DATABASE_URL;
      delete process.env.APP_URL;
      delete process.env.API_PUBLIC_URL;
      delete process.env.ENCRYPTION_KEY;
    });
  });

  test("auth and recovery limits are independent of RATE_LIMIT_MAX", async () => {
    await withEnv({ RATE_LIMIT_MAX: "2000", AUTH_RATE_LIMIT_MAX: undefined, RECOVERY_RATE_LIMIT_MAX: undefined }, async () => {
      const cfg = await loadConfig();
      assert.equal(cfg.rateLimitMax, 2000);
      assert.equal(cfg.authRateLimitMax, 15, "auth should not follow global limit");
      assert.equal(cfg.recoveryRateLimitMax, 5, "recovery should not follow global limit");
    });
  });
});

describe("rate limit enforcement", () => {
  test("auth rate limit rejects after the configured budget", async () => {
    const cfg: Config = { ...baseConfig, authRateLimitMax: 2, rateLimitMax: 10_000, recoveryRateLimitMax: 10_000 };
    const { app } = await createApp(cfg, db);
    for (let i = 0; i < 2; i++) {
      await request(app).post("/api/auth/login").set("Origin", cfg.appUrl).send({ email: "a@b.c", password: "x" });
    }
    const blocked = await request(app).post("/api/auth/login").set("Origin", cfg.appUrl).send({ email: "a@b.c", password: "x" });
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers["retry-after"], "should include retry-after header");
  });

  test("global rate limit rejects after the configured budget", async () => {
    const cfg: Config = { ...baseConfig, rateLimitMax: 2, authRateLimitMax: 10_000, recoveryRateLimitMax: 10_000 };
    const { app } = await createApp(cfg, db);
    for (let i = 0; i < 2; i++) {
      const res = await request(app).get("/api/health");
      assert.equal(res.status, 200);
    }
    const blocked = await request(app).get("/api/health");
    assert.equal(blocked.status, 429);
  });
});
