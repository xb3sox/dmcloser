import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const suites = readdirSync("server/tests")
  .filter((name) => name.endsWith(".test.ts"))
  .sort();

for (const suite of suites) {
  console.log(`Running Postgres test suite: server/tests/${suite}`);
  const result = spawnSync("npx", ["tsx", "--test", `server/tests/${suite}`], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
