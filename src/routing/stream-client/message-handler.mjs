import { compareBundleVersions } from "../bundle-version.mjs";
import { parseRoutingEvent } from "./events.mjs";
import { handleShutdownEvent } from "./shutdown-event.mjs";

export function createRoutingMessageHandler({ state, fallback, reconnect, now, onError }) {
  return async ({ data }) => {
    try {
      const event = parseRoutingEvent(data);
      const shutdown = handleShutdownEvent(event, { state, fallback, reconnect, now });
      if (shutdown) {
        await shutdown;
        return;
      }
      const version = event.version;
      if (
        version !== undefined &&
        state.expectedVersion !== 0 &&
        compareBundleVersions(version, state.expectedVersion) <= 0
      )
        return;
      const numericVersion = Number(version);
      const numericExpected = Number(state.expectedVersion);
      if (
        Number.isInteger(numericVersion) &&
        Number.isInteger(numericExpected) &&
        numericExpected > 0 &&
        numericVersion > numericExpected + 1
      )
        await fallback();
      state.expectedVersion = version;
      if (event.type === "routing.topology") {
        await fallback();
        return;
      }
      state.updateHandler?.(event);
    } catch (error) {
      onError?.(error);
    }
  };
}
