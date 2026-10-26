import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { realpathSync } from "node:fs";

/**
 * Finds case collisions in a list of file paths.
 * Returns an array of collision groups (where each group has >1 distinct path matching the same lower-case string).
 */
export function findCaseCollisions(paths) {
  const map = new Map();
  for (const path of paths) {
    const key = path.toLowerCase();
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    map.get(key).add(path);
  }

  const collisions = [];
  for (const set of map.values()) {
    if (set.size > 1) {
      collisions.push(Array.from(set));
    }
  }
  return collisions;
}

export function getTrackedFiles() {
  const stdout = execSync("git ls-files", { encoding: "utf8" });
  return stdout.split("\n").filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);

  // If command line arguments are provided, evaluate them as the synthetic file list.
  if (args.length > 0) {
    const collisions = findCaseCollisions(args);
    if (collisions.length > 0) {
      console.error("Case collisions found in argument list:");
      for (const group of collisions) {
        console.error(`  - ${group.join(" <-> ")}`);
      }
      process.exit(1);
    }
    process.exit(0);
  }

  // Self-test synthetic list A.md / a.md behavior
  const syntheticTestCollisions = findCaseCollisions(["A.md", "a.md"]);
  if (syntheticTestCollisions.length === 0) {
    console.error("Self-test error: findCaseCollisions failed to detect synthetic A.md/a.md collision");
    process.exit(1);
  }

  // Check the real git tracked tree
  const trackedFiles = getTrackedFiles();
  const realCollisions = findCaseCollisions(trackedFiles);

  if (realCollisions.length > 0) {
    console.error("Case collisions found in tracked repository files:");
    for (const group of realCollisions) {
      console.error(`  - ${group.join(" <-> ")}`);
    }
    process.exit(1);
  }

  console.log("No file path case collisions found.");
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    const entry = realpathSync(process.argv[1]);
    return fileURLToPath(import.meta.url) === entry;
  } catch {
    // Fallback to resolved path if realpath fails (e.g. Windows path casing)
    return fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  }
}

if (isMainModule()) {
  main();
}
