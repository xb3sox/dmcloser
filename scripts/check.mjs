import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

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
for (const [command, args] of [
  ["npx", ["tsc", "--noEmit"]],
  ["npx", ["tsc", "-p", "tsconfig.server.json"]],
  ["npx", ["tsx", "--test", "server/tests/product.test.ts"]],
  ["npx", ["tsx", "--test", "server/tests/revenue.test.ts"]],
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
