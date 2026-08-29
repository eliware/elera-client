
const emptyMetrics = { begin: () => undefined, record: () => {} };

export function createTimedOperation({ metrics = emptyMetrics, now = () => Date.now() } = {}) {
  return async function timed(operation) {
    const started = metrics.begin();
    try {
      const result = await operation();
      metrics.record({ latencyMs: started === undefined ? 0 : now() - started });
      return result;
    } catch (error) {
      metrics.record({ latencyMs: started === undefined ? 0 : now() - started, failed: true });
      throw error;
    }
  };
}

