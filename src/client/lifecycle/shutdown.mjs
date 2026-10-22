export function createPoolShutdown({ getPools, drainTimeoutMs, metrics }) {
  let closing;
  const closePools = async () => {
    metrics?.stop?.();
    const pools = getPools();
    pools.forEach((pool) => pool.drain(drainTimeoutMs));
    const idleResults = await Promise.all(pools.map((pool) => pool.waitForIdle(drainTimeoutMs)));
    const idle = idleResults.every(
      (result) => result === true || (Array.isArray(result) && result.every(Boolean)),
    );
    if (!idle) throw new Error("Timed out waiting for active SQL connections to become idle");
    await Promise.all(pools.map((pool) => pool.close()));
  };
  const close = () => {
    if (!closing) {
      closing = closePools().catch((error) => {
        closing = undefined;
        throw error;
      });
    }
    return closing;
  };
  return { close };
}
