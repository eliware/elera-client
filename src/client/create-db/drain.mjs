import { clientDrainTimeout } from "../drain-policy.mjs";

export function createClientDrain({ getPools, defaultTimeout }) {
  return (host, timeoutMs = defaultTimeout) => {
    const effectiveTimeout = clientDrainTimeout(timeoutMs);
    const pools = getPools();
    pools.forEach((pool) => pool.drain(host, effectiveTimeout));
    return {
      host,
      timeoutMs: effectiveTimeout,
      wait: () => Promise.all(pools.map((pool) => pool.waitForIdle(effectiveTimeout))),
      forceClose: () => Promise.all(pools.map((pool) => pool.forceClose(host))),
    };
  };
}
