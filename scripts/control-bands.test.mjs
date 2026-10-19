import { test } from "node:test";
import assert from "node:assert/strict";
import { controlBreaches } from "./control-bands.mjs";
const healthy = {
  jobs: { dead_jobs: 0, oldestPendingAgeMs: 0 },
  latency: { samples: 0, p95_ms: null },
};
test("healthy and undersampled latency do not create false incidents", () => {
  assert.deepEqual(controlBreaches(healthy), []);
  assert.deepEqual(
    controlBreaches({ ...healthy, latency: { samples: 19, p95_ms: 9999 } }),
    [],
  );
});
test("deterministic control bands catch stalled work and sustained latency", () => {
  const breaches = controlBreaches({
    jobs: { dead_jobs: 2, oldestPendingAgeMs: 60001 },
    latency: { samples: 20, p95_ms: 2001 },
  });
  assert.equal(breaches.length, 3);
});
