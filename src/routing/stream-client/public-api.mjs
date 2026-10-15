export function createRoutingStreamApi({ state, reconnect, stopHeartbeat }) {
  return {
    sendTelemetry: (payload) => {
      if (state.socket?.readyState === 1) state.socket.send(JSON.stringify(payload));
    },
    setOnUpdate: (handler) => (state.updateHandler = handler),
    setTelemetry: (value) => (state.telemetry = value),
    close: () => {
      state.closed = true;
      state.mode = "disconnected";
      reconnect.cancel();
      stopHeartbeat(state.heartbeat);
      state.socket?.close?.();
    },
    state: () => ({
      connected: state.socket?.readyState === 1,
      mode: state.mode,
      expectedVersion: state.expectedVersion,
      endpoint: state.activeEndpoint,
      reconnectDeadlineAt: state.reconnectDeadlineAt,
    }),
  };
}
