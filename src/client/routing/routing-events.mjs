import { normalizeRoutingUpdate } from "./routing-event-normalization.mjs";
import { handleLifecycleRoutingEvent } from "./lifecycle-events.mjs";

export function createRoutingEventHandler({ refresh, getPools, drainTimeoutMs }) {
  return async function handle(event) {
    const update = normalizeRoutingUpdate(event);
    if (update) await refresh(update);
    const pools = getPools();
    handleLifecycleRoutingEvent(event, pools, drainTimeoutMs);
  };
}
