export function createRoutingStreamState({ endpoint, onUpdate, telemetry }) {
  return {
    socket: undefined,
    closed: false,
    connecting: false,
    heartbeat: undefined,
    expectedVersion: 0,
    updateHandler: onUpdate,
    mode: "disconnected",
    plannedReconnect: false,
    lastReconnectWasPlanned: false,
    disconnectedAt: undefined,
    reconnectDeadlineAt: undefined,
    activeEndpoint: endpoint,
    telemetry,
  };
}
