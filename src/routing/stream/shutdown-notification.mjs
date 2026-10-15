export function notifyShutdownUpdate(state, event) {
  state.updateHandler?.(event);
}
