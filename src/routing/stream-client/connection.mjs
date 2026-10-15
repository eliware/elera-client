import { startHeartbeat } from "./heartbeat.mjs";
import { createConnectionRecovery } from "./connection-recovery.mjs";

export async function connectRoutingSocket({
  state,
  WebSocketImpl,
  streamUrl,
  token,
  heartbeatMs,
  now,
  telemetry,
  reconnect,
  fallback,
  schedule,
  onMessage,
  onError,
}) {
  const recovery = createConnectionRecovery({ state, now, fallback, schedule });
  if (
    state.closed ||
    state.connecting ||
    state.socket?.readyState === 1 ||
    (state.reconnectDeadlineAt !== undefined && now() >= state.reconnectDeadlineAt)
  )
    return;
  if (typeof WebSocketImpl !== "function") {
    await fallback();
    schedule();
    return;
  }
  try {
    state.connecting = true;
    state.socket = new WebSocketImpl(streamUrl(), {
      headers: { authorization: `Bearer ${token ?? ""}` },
    });
    state.socket.onopen = () => {
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
    state.socket.onmessage = onMessage;
    state.socket.onerror = (error) => onError?.(error);
    state.socket.onclose = () => recovery.close();
  } catch (error) {
    await recovery.fail(error, onError);
  }
}
