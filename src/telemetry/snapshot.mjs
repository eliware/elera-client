export function createTelemetrySnapshot({ context, operationStats, reconnectStats, now }) {
  return {
    type: "client.telemetry",
    ...context,
    ...operationStats,
    ...reconnectStats,
    avgLatencyMs: operationStats.queries
      ? operationStats.totalLatencyMs / operationStats.queries
      : 0,
    sentAt: new Date(now()).toISOString(),
  };
}
