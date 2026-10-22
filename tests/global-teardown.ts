// Removes the PGlite directory the browser suite ran the API against. The
// Playwright config names it after the runner pid, so only the server this
// run started can have written it, and Playwright stops that server before
// this teardown runs. The path is anchored to the config directory, which is
// where the web server resolves its relative DATA_DIR.
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const dataDir = resolve(import.meta.dirname, "..", `.data/browser-tests-${process.pid}`);

export default async function globalTeardown(): Promise<void> {
  await rm(dataDir, { recursive: true, force: true });
  // Failing here is the regression for the leak: the directory survived.
  if (existsSync(dataDir)) {
    throw new Error(`Playwright data directory was not removed: ${dataDir}`);
  }
}
