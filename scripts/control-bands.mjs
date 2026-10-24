export function percentile(values, p) {
  if (!values || !values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function controlBreaches(data) {
  const breaches = [];
  if (data?.jobs?.dead_jobs > 0)
    breaches.push(`Dead jobs: ${data.jobs.dead_jobs}`);
  if (data?.jobs?.oldestPendingAgeMs > 60000)
    breaches.push(`Oldest queued job: ${data.jobs.oldestPendingAgeMs}ms`);

  let samples = data?.latency?.samples ?? 0;
  let p95Ms = data?.latency?.p95_ms;

  if (Array.isArray(data?.latency?.values)) {
    samples = data.latency.values.length;
    p95Ms = percentile(data.latency.values, 0.95);
  }

  if (samples >= 20 && p95Ms !== null && p95Ms !== undefined && Number(p95Ms) > 2000)
    breaches.push(
      `AI p95: ${p95Ms}ms across ${samples} samples`,
    );
  return breaches;
}
