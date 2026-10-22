export function isShutdownEvent(event) {
  return event.type === "routing.shutdown";
}

export function dispatchRoutingEvent(event, { state, fallback }) {
  if (event.type === "routing.topology") {
    return Promise.resolve(state.updateHandler?.(event)).then(fallback);
  }
  state.updateHandler?.(event);
}
