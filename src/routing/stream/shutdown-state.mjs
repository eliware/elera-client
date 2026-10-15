import { activeEndpointFromShutdown } from "./address.mjs";

export function applyShutdownState(event, { state, now }) {
  state.activeEndpoint = activeEndpointFromShutdown(state.activeEndpoint, event);
  state.reconnectDeadlineAt = now() + event.reconnectDeadlineMs;
  state.plannedReconnect = true;
}
