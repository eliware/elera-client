export function createOperationStats() {
  const stats = {
    queries: 0,
    failures: 0,
    retries: 0,
    inflight: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    routes: { primary: 0, balanced: 0 },
  };
  return {
    begin(now) {
      stats.inflight += 1;
      return now();
    },
    record({ latencyMs = 0, failed = false, retry = false, route } = {}) {
      stats.queries += 1;
      stats.inflight = Math.max(0, stats.inflight - 1);
      stats.totalLatencyMs += latencyMs;
      stats.maxLatencyMs = Math.max(stats.maxLatencyMs, latencyMs);
      if (route === "primary" || route === "balanced") stats.routes[route] += 1;
      if (failed) stats.failures += 1;
      if (retry) stats.retries += 1;
    },
    snapshot() {
      return stats;
    },
  };
}
