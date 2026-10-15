import { parseRoutingEvent } from "./events.mjs";
import { handleShutdownEvent } from "./shutdown-event.mjs";
import { orderRoutingEvent } from "./event-ordering.mjs";
import { dispatchRoutingEvent } from "./event-dispatch.mjs";

export function createRoutingMessageHandler({ state, fallback, reconnect, now, onError }) {
  return async ({ data }) => {
    try {
      const event = parseRoutingEvent(data);
      const shutdown = handleShutdownEvent(event, { state, fallback, reconnect, now });
      if (shutdown) {
        await shutdown;
        return;
      }
      const ordering = orderRoutingEvent(event, { state, fallback });
      if (!ordering.accepted) return;
      if (ordering.recovery) {
        await ordering.recovery;
        ordering.complete();
      }
      const dispatched = dispatchRoutingEvent(event, { state, fallback });
      if (dispatched) await dispatched;
    } catch (error) {
      onError?.(error);
    }
  };
}
