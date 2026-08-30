export function createTelemetry({ application = 'default', credentialName = undefined, database = undefined, scopes = undefined, intervalMs = 1000, now = () => Date.now(), setIntervalImpl = setInterval, clearIntervalImpl = clearInterval } = {}) {
  const stats = { queries: 0, failures: 0, retries: 0, reconnects: 0, failoverCount: 0, reconnectDelayMs: 0, inflight: 0, totalLatencyMs: 0, maxLatencyMs: 0, routes: { primary: 0, balanced: 0 } };
  let timer;
  const begin = () => { stats.inflight += 1; return now(); };
  const record = ({ latencyMs = 0, failed = false, retry = false, reconnect = false, failover = false, route } = {}) => { stats.queries += 1; stats.inflight = Math.max(0, stats.inflight - 1); stats.totalLatencyMs += latencyMs; stats.maxLatencyMs = Math.max(stats.maxLatencyMs, latencyMs); if (route === 'primary' || route === 'balanced') stats.routes[route] += 1; if (failed) stats.failures += 1; if (retry) stats.retries += 1; if (reconnect) stats.reconnects += 1; if (failover) stats.failoverCount += 1; };
  const snapshot = () => ({ type: 'client.telemetry', application, credentialName, database, scopes, ...stats, avgLatencyMs: stats.queries ? stats.totalLatencyMs / stats.queries : 0, sentAt: new Date(now()).toISOString() });
  const recordReconnect = ({ delayMs = 0, failover = false } = {}) => { stats.reconnects += 1; stats.reconnectDelayMs += Math.max(0, Number(delayMs) || 0); if (failover) stats.failoverCount += 1; };
  return { begin, record, recordReconnect, snapshot, start(stream) { if (timer) return; timer = setIntervalImpl(() => stream.sendTelemetry?.(snapshot()), intervalMs); timer.unref?.(); }, stop() { if (timer) clearIntervalImpl(timer); timer = undefined; } };
}
