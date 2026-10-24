#!/usr/bin/env node
/**
 * Fails when an applied migration file changes. A forward-only migration that is
 * edited splits fresh and existing databases, which is how main lost Prisma parity.
 *
 *   node scripts/check-migrations.mjs            # verify
 *   node scripts/check-migrations.mjs --update   # register current/new files
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "server/migrations");
const SUMS = join(DIR, "CHECKSUMS.json");
const update = process.argv.includes("--update");

const files = readdirSync(DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const previous = existsSync(SUMS) ? JSON.parse(readFileSync(SUMS, "utf8")) : {};
const next = {};
const changed = [];
const unregistered = [];

for (const file of files) {
  const hash = createHash("sha256").update(readFileSync(join(DIR, file))).digest("hex");
  next[file] = hash;
  if (!previous[file]) unregistered.push(file);
  else if (previous[file] !== hash) changed.push(file);
}

if (changed.length > 0) {
  console.error("Applied migrations changed. Add a new numbered migration instead:");
  for (const file of changed) console.error(`  - server/migrations/${file}`);
  process.exitCode = 1;
} else if (!update && unregistered.length > 0) {
  console.error("New migrations must be registered. Run `node scripts/check-migrations.mjs --update`:");
  for (const file of unregistered) console.error(`  - server/migrations/${file}`);
  process.exitCode = 1;
} else if (update) {
  writeFileSync(SUMS, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Recorded ${files.length} migration checksums.`);
} else {
  console.log(`Migration checksums match (${files.length} files).`);
}
