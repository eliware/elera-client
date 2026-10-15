import { compareBundleVersions } from "../bundle-version.mjs";
import { activeEndpointFromShutdown } from "./address.mjs";
import { parseRoutingEvent } from "./events.mjs";

export function createRoutingMessageHandler({ state, fallback, reconnect, now, onError }) {
  return async ({ data }) => {
    try {
      const event = parseRoutingEvent(data);
      if (event.type === "routing.shutdown") {
        state.activeEndpoint = activeEndpointFromShutdown(state.activeEndpoint, event);
        state.updateHandler?.(event);
        const deadlineMs = event.reconnectDeadlineMs;
        state.reconnectDeadlineAt = now() + deadlineMs;
        state.plannedReconnect = true;
        if (deadlineMs <= 0) reconnect.cancel();
        reconnect.reset();
        await fallback();
        state.socket?.close?.(1012, "supervisor restarting");
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
