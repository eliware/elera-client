export function createPoolShutdown({ getPools, drainTimeoutMs, metrics }) {
  let closing;
  const close = async () => {
    if (closing) return closing;
    closing = (async () => {
      metrics?.stop?.();
      const pools = getPools();
      pools.forEach((pool) => pool.drain(drainTimeoutMs));
      await Promise.all(pools.map((pool) => pool.waitForIdle(drainTimeoutMs)));
      await Promise.all(pools.map((pool) => pool.close()));
    })();
    return closing;
  };
  return { close };
}
