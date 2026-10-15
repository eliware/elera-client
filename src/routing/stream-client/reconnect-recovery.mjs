export function recoverConnectionClose({ state, now, fallback, schedule }) {
  if (state.closed) return;
  state.disconnectedAt = now();
  state.lastReconnectWasPlanned = state.plannedReconnect;
  if (!state.plannedReconnect) void fallback();
  state.plannedReconnect = false;
  schedule();
}
