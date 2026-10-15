import { createOperationStats } from "./operation-stats.mjs";
import { createReconnectStats } from "./reconnect-stats.mjs";
import { createTelemetryContext } from "./context.mjs";

export function createTelemetryState({
  application = "default",
  credentialName = undefined,
  database = undefined,
  scopes = undefined,
  now = () => Date.now(),
} = {}) {
  const operations = createOperationStats();
  const reconnects = createReconnectStats();
  const context = createTelemetryContext({ application, credentialName, database, scopes });
  const record = (value = {}) => {
    operations.record(value);
    reconnects.recordOperation(value);
  };
  return {
    begin: () => operations.begin(now),
    record,
    recordReconnect: reconnects.recordReconnect,
    snapshot: () => {
      const operationStats = operations.snapshot();
      return {
        type: "client.telemetry",
        ...context.snapshot(),
        ...operationStats,
        ...reconnects.snapshot(),
        avgLatencyMs: operationStats.queries
          ? operationStats.totalLatencyMs / operationStats.queries
          : 0,
        sentAt: new Date(now()).toISOString(),
      };
    },
    setContext: context.set,
  };
}
