import { applyShutdownState } from "./shutdown-state.mjs";

export function handleShutdownEvent(event, context) {
  return runShutdown(event, context);
}

async function runShutdown(event, { state, fallback, reconnect, now }) {
  applyShutdownState(event, { state, now });
  state.updateHandler?.(event);
  const deadlineMs = event.reconnectDeadlineMs;
  if (deadlineMs <= 0) reconnect.cancel();
  reconnect.reset();
  await fallback();
  state.socket?.close?.(1012, "supervisor restarting");
  return true;
}
