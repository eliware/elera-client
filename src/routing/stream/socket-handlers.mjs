import { startHeartbeat } from "./heartbeat.mjs";

export function bindSocketHandlers({
  socket,
  state,
  heartbeatMs,
  now,
  telemetry,
  reconnect,
  recovery,
  onMessage,
  onError,
}) {
  socket.onopen = () => {
    state.connecting = false;
    state.mode = "websocket";
    state.reconnectDeadlineAt = undefined;
    reconnect.reset();
    if (state.disconnectedAt !== undefined) {
      telemetry?.recordReconnect?.({
        delayMs: Math.max(0, now() - state.disconnectedAt),
        failover: state.lastReconnectWasPlanned,
      });
      state.disconnectedAt = undefined;
      state.lastReconnectWasPlanned = false;
    }
    state.heartbeat = startHeartbeat({ getSocket: () => state.socket, heartbeatMs, now });
  };
  socket.onmessage = onMessage;
  socket.onerror = (error) => onError?.(error);
  socket.onclose = () => recovery.close();
}
