export function canStartConnection({ state, now }) {
  return !(
    state.closed ||
    state.connecting ||
    state.socket?.readyState === 1 ||
    (state.reconnectDeadlineAt !== undefined && now() >= state.reconnectDeadlineAt)
  );
}
