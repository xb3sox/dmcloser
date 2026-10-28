#!/usr/bin/env node
/**
 * Proves prisma/schema.prisma still describes the database the SQL migrations build.
 *
 *   node scripts/prisma/verify-parity.mjs            # ephemeral Postgres on 5433
 *   PARITY_DATABASE_URL=postgres://... node ...      # diff against an existing server
 *
 * Steps: apply server/migrations/*.sql in filename order to an empty database, ask Prisma
 * for the diff from that database to the datamodel, and fail when the diff is not empty.
 * A schema file nobody verifies is worse than no schema file: it looks authoritative and
 * is wrong the first time someone edits a .sql.
 */
import { spawn, spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CONTAINER = "dmc-prisma-parity";
const PORT = 5433;
const SCHEMA = join(ROOT, "prisma/schema.prisma");
const MIGRATIONS = join(ROOT, "server/migrations");

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const explicitUrl =
  (args.includes("--url") ? args[args.indexOf("--url") + 1] : undefined) ||
  process.env.PARITY_DATABASE_URL;

function sh(command, argv, options = {}) {
  return spawnSync(command, argv, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
}

function dockerUp() {
  const existing = sh("docker", [
    "ps",
    "-a",
    "--filter",
    `name=^/${CONTAINER}$`,
    "--format",
    "{{.Names}}",
  ]);
  if (existing.error)
    throw new Error(
      `Docker is unavailable (${existing.error.message}). Start Docker, or set PARITY_DATABASE_URL to an empty scratch database.`,
    );
  if (existing.status !== 0)
    throw new Error(`docker ps failed: ${existing.stderr || existing.stdout}`);
  if (existing.stdout.trim()) sh("docker", ["rm", "-f", CONTAINER]);
  const run = sh("docker", [
    "run",
    "-d",
    "--name",
    CONTAINER,
    "-e",
    "POSTGRES_PASSWORD=parity",
    "-e",
    "POSTGRES_USER=parity",
    "-e",
    "POSTGRES_DB=parity",
    "-p",
    `127.0.0.1:${PORT}:5432`,
    "postgres:17-alpine",
  ]);
  if (run.error || run.status !== 0)
    throw new Error(
      `docker run failed: ${run.stderr || run.stdout || run.error?.message || "unknown error"}`,
    );
  return `postgres://parity:parity@127.0.0.1:${PORT}/parity`;
}

async function waitFor(url, timeoutMs = 60000) {
  const started = Date.now();
  for (;;) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      await client.end().catch(() => {});
      if (Date.now() - started > timeoutMs)
        throw new Error(`database never became reachable: ${error.message}`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

async function applyMigrations(url) {
  const files = (await readdir(MIGRATIONS))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) {
      const sql = await readFile(join(MIGRATIONS, file), "utf8");
      await client.query(sql);
      console.log(`  applied ${file}`);
    }
  } finally {
    await client.end();
  }
  return files.length;
}

/** Prisma prints comments, blank lines and trailing semicolons; none are differences. */
function normalize(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, "").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .replace(/;\s*$/, "")
    .trim();
}

async function main() {
  const url = explicitUrl || dockerUp();
  const owned = !explicitUrl;
  try {
    await waitFor(url);
    const count = await applyMigrations(url);
    console.log(`  ${count} migrations applied`);

    const diff = sh(
      "npx",
      [
        "--yes",
        "prisma@6",
        "migrate",
        "diff",
        "--from-url",
        url,
        "--to-schema-datamodel",
        SCHEMA,
        "--script",
      ],
      { timeout: 180000 },
    );
    if (diff.status !== 0)
      throw new Error(`prisma migrate diff failed: ${diff.stderr}`);

    const body = normalize(diff.stdout);
    if (body) {
      console.error("\nFAIL — schema.prisma and the SQL migrations disagree:\n");
      console.error(diff.stdout.trim());
      process.exitCode = 1;
    } else {
      console.log(
        "\nPASS — schema.prisma matches the database built by the SQL migrations.",
      );
    }
  } finally {
    if (owned && !keep) sh("docker", ["rm", "-f", CONTAINER]);
    else if (owned) console.log(`  kept container ${CONTAINER} on port ${PORT}`);
  }
}

main().catch((error) => {
  console.error(`\nHARNESS ERROR — ${error.message}`);
  process.exitCode = 2;
});
