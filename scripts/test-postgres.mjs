import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

// A suite normally finishes in seconds. The bound turns a future stall into a
// named failure instead of letting the whole job sit until its 35-minute limit.
const requestedTimeout = Number(process.env.TEST_SUITE_TIMEOUT_MS || 120000);
const suiteTimeoutMs =
  Number.isFinite(requestedTimeout) && requestedTimeout > 0
    ? requestedTimeout
    : 120000;
const suites = readdirSync("server/tests")
  .filter((name) => name.endsWith(".test.ts"))
  .sort();

for (const suite of suites) {
  console.log(`Running Postgres test suite: server/tests/${suite}`);
  const started = Date.now();
  const result = spawnSync(
    "npx",
    ["tsx", "--test", "--test-force-exit", `server/tests/${suite}`],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
      timeout: suiteTimeoutMs,
      killSignal: "SIGKILL",
    },
  );
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.error?.code === "ETIMEDOUT") {
    console.error(
      `::error::server/tests/${suite} exceeded ${suiteTimeoutMs}ms. Rerun it alone with TEST_DATABASE_URL to reproduce.`,
    );
    process.exit(1);
  }
  if (result.signal) {
    console.error(
      `::error::server/tests/${suite} was terminated by ${result.signal} after ${seconds}s.`,
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`::error::server/tests/${suite} failed after ${seconds}s.`);
    process.exit(result.status || 1);
  }
  console.log(`Passed server/tests/${suite} in ${seconds}s.`);
}
