import { clientDrainTimeout } from "../drain-policy.mjs";
import { normalizeRoutingUpdate } from "./routing-event-normalization.mjs";

export function createRoutingEventHandler({ refresh, getPools, drainTimeoutMs }) {
  return async function handle(event) {
    const update = normalizeRoutingUpdate(event);
    if (update) await refresh(update);
    const pools = getPools();
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
  };
}
