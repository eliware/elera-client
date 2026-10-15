import { stopHeartbeat } from "./heartbeat.mjs";

export function createConnectionRecovery({ state, now, fallback, schedule }) {
  return {
    close() {
      state.connecting = false;
      stopHeartbeat(state.heartbeat);
      state.heartbeat = undefined;
      state.socket = undefined;
      state.mode = "disconnected";
      if (state.closed) return;
      state.disconnectedAt = now();
      state.lastReconnectWasPlanned = state.plannedReconnect;
      if (!state.plannedReconnect) void fallback();
      state.plannedReconnect = false;
      schedule();
    },
    async fail(error, onError) {
      state.connecting = false;
      state.socket = undefined;
      state.mode = "disconnected";
      onError?.(error);
      await fallback();
      schedule();
    },
  };
}
