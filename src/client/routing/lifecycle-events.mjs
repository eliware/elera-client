import { clientDrainTimeout } from "../lifecycle/drain-policy.mjs";

export function handleLifecycleRoutingEvent(event, pools, drainTimeoutMs) {
  if (event.type === "routing.drain")
    for (const pool of pools)
      pool.drain(event.node, clientDrainTimeout(event.drainTimeoutMs ?? drainTimeoutMs));
  if (event.type === "routing.shutdown")
    for (const pool of pools)
      pool.drain(
        event.node,
        clientDrainTimeout(event.reconnectDeadlineMs ?? event.drainTimeoutMs ?? drainTimeoutMs),
      );
  if (event.type === "routing.recovery")
    for (const pool of pools) pool.recover(event.node, drainTimeoutMs);
}
