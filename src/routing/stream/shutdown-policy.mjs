export function shouldCancelShutdownReconnect(event) {
  return event.reconnectDeadlineMs <= 0;
}
