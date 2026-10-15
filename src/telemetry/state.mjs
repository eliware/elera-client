import { createOperationStats } from "./operation-stats.mjs";
import { createReconnectStats } from "./reconnect-stats.mjs";
import { createTelemetryContext } from "./context.mjs";
import { createTelemetrySnapshot } from "./snapshot.mjs";

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
      return createTelemetrySnapshot({
        context: context.snapshot(),
        operationStats: operations.snapshot(),
        reconnectStats: reconnects.snapshot(),
        now,
      });
    },
    setContext: context.set,
  };
}
