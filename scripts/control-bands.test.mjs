import { test } from "node:test";
import assert from "node:assert/strict";
import { controlBreaches, percentile } from "./control-bands.mjs";

const healthy = {
  jobs: { dead_jobs: 0, oldestPendingAgeMs: 0 },
  latency: { samples: 0, p95_ms: null },
};

test("percentile function correctly calculates values across edge cases", () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile(null, 0.95), null);
  assert.equal(percentile([1500], 0.95), 1500);

  // Exact 10 elements: indices 0..9. p=0.5 -> index 4.5 -> avg of sorted[4] and sorted[5]
  const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentile(data, 0), 10);
  assert.equal(percentile(data, 1), 100);
  assert.equal(percentile(data, 0.5), 55);

  // Unsorted array test
  const unsorted = [1000, 200, 500, 2500, 1500]; // sorted: [200, 500, 1000, 1500, 2500]
  // 5 elements, indices 0..4. p=0.95 -> index = 4 * 0.95 = 3.8 -> 1500 + 0.8 * (2500 - 1500) = 2300
  assert.equal(percentile(unsorted, 0.95), 2300);
});

test("healthy and undersampled latency do not create false incidents", () => {
  assert.deepEqual(controlBreaches(healthy), []);
  assert.deepEqual(
    controlBreaches({ ...healthy, latency: { samples: 19, p95_ms: 9999 } }),
    [],
  );
  assert.deepEqual(
    controlBreaches({ ...healthy, latency: { samples: 20, p95_ms: 2000 } }),
    [],
  );
});

test("deterministic control bands catch stalled work and sustained latency", () => {
  const breaches = controlBreaches({
    jobs: { dead_jobs: 2, oldestPendingAgeMs: 60001 },
    latency: { samples: 20, p95_ms: 2001 },
  });
  assert.equal(breaches.length, 3);
  assert.ok(breaches[2].includes("AI p95: 2001ms across 20 samples"));
});

test("controlBreaches calculates p95 from raw array when provided", () => {
  const values20Pass = Array(20).fill(1800);
  assert.deepEqual(
    controlBreaches({ ...healthy, latency: { values: values20Pass } }),
    [],
  );

  const values20Breach = Array(18).fill(1000).concat([2500, 3000]);
  const breaches = controlBreaches({
    ...healthy,
    latency: { values: values20Breach },
  });
  assert.equal(breaches.length, 1);
  assert.ok(breaches[0].includes("across 20 samples"));
});
