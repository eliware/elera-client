export function createReconnectStats() {
  const stats = { reconnects: 0, failoverCount: 0, reconnectDelayMs: 0 };
  return {
    recordOperation({ reconnect = false, failover = false } = {}) {
      if (reconnect) stats.reconnects += 1;
      if (failover) stats.failoverCount += 1;
    },
    recordReconnect({ delayMs = 0, failover = false } = {}) {
      stats.reconnects += 1;
      stats.reconnectDelayMs += Math.max(0, Number(delayMs) || 0);
      if (failover) stats.failoverCount += 1;
    },
    snapshot() {
      return stats;
    },
  };
}
