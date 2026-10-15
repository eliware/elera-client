import { activeEndpointFromShutdown } from "./address.mjs";

export function handleShutdownEvent(event, context) {
  return runShutdown(event, context);
}

async function runShutdown(event, { state, fallback, reconnect, now }) {
  state.activeEndpoint = activeEndpointFromShutdown(state.activeEndpoint, event);
  state.updateHandler?.(event);
  const deadlineMs = event.reconnectDeadlineMs;
  state.reconnectDeadlineAt = now() + deadlineMs;
  state.plannedReconnect = true;
  if (deadlineMs <= 0) reconnect.cancel();
  reconnect.reset();
  await fallback();
  state.socket?.close?.(1012, "supervisor restarting");
  return true;
}
