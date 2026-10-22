export function resolveManagedRuntimeOptions(options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    fetchPath,
    WebSocketImpl = globalThis.WebSocket,
    mysqlLib,
    log,
    routing = "auto",
    quarantineMs = 5000,
    drainTimeoutMs = 45000,
    now = () => Date.now(),
    telemetry = true,
  } = options;
  return {
    fetchImpl,
    fetchPath,
    WebSocketImpl,
    mysqlLib,
    log,
    routing,
    quarantineMs,
    drainTimeoutMs,
    now,
    telemetry,
  };
}
