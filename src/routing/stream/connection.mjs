import { createConnectionRecovery } from "./connection-recovery.mjs";
import { createConnectionFailure, handleMissingWebSocketSupport } from "./connection-failure.mjs";
import { bindSocketHandlers } from "./socket-handlers.mjs";
import { canStartConnection } from "./connection-eligibility.mjs";

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
  const failConnection = createConnectionFailure({ state, fallback, schedule });
  if (!canStartConnection({ state, now })) return;
  if (typeof WebSocketImpl !== "function") {
    await handleMissingWebSocketSupport({ fallback, schedule });
    return;
  }
  try {
    state.connecting = true;
    state.socket = new WebSocketImpl(streamUrl(), {
      headers: { authorization: `Bearer ${token ?? ""}` },
    });
    bindSocketHandlers({
      socket: state.socket,
      state,
      heartbeatMs,
      now,
      telemetry,
      reconnect,
      recovery,
      onMessage,
      onError,
    });
  } catch (error) {
    await failConnection(error, onError);
  }
}
