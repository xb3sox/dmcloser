import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const artifacts = [
  "intent.md",
  "spec.md",
  "plan.md",
  "CLAUDE.md",
  "ROADMAP.md",
];
for (const artifact of artifacts)
  if (!readFileSync(artifact, "utf8").trim())
    throw new Error(`Missing SDLC artifact: ${artifact}`);
// Every server suite is its own process: they share a PGlite data directory
// and must not run concurrently. Discovering the list means a new suite
// cannot be added without the gate noticing.
const suites = readdirSync("server/tests")
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => ["npx", ["tsx", "--test", `server/tests/${name}`]]);
for (const [command, args] of [
  ["npx", ["tsc", "--noEmit"]],
  ["npx", ["tsc", "-p", "tsconfig.server.json"]],
  ...suites,
  ["node", ["--test", "scripts/control-bands.test.mjs"]],
  ["npm", ["run", "build"]],
  ["npm", ["audit", "--audit-level=moderate"]],
]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
