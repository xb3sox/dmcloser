export function controlBreaches(data) {
  const breaches = [];
  if (data.jobs.dead_jobs > 0)
    breaches.push(`Dead jobs: ${data.jobs.dead_jobs}`);
  if (data.jobs.oldestPendingAgeMs > 60000)
    breaches.push(`Oldest queued job: ${data.jobs.oldestPendingAgeMs}ms`);
  if (data.latency.samples >= 20 && Number(data.latency.p95_ms) > 2000)
    breaches.push(
      `AI p95: ${data.latency.p95_ms}ms across ${data.latency.samples} samples`,
    );
  return breaches;
}
