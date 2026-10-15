export function dispatchRoutingEvent(event, { state, fallback }) {
  if (event.type === "routing.topology") {
    return fallback();
  }
  state.updateHandler?.(event);
}
