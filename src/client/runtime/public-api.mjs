export function createClientApi({
  execution,
  transaction,
  diagnostics,
  refreshBundle,
  shutdown,
  probe,
  getPrimaryPool,
  getBundle,
  setNodeAvailability,
  attachRoutingStream,
  drain,
  telemetry,
}) {
  const client = {
    async query(sql, values, options) {
      return execution.query(sql, values, options);
    },
    async execute(sql, values, options) {
      return execution.execute(sql, values, options);
    },
    probe,
    async transaction(callback) {
      return transaction(callback);
    },
    async getConnection() {
      return getPrimaryPool().getConnection();
    },
    async health(route = "primary") {
      return diagnostics.health(route);
    },
    async refresh(nextBundle) {
      return refreshBundle(nextBundle);
    },
    async attachRoutingStream(stream) {
      return attachRoutingStream(stream, client);
    },
    drain,
    availability() {
      return diagnostics.availability();
    },
    nodeStates() {
      return diagnostics.nodeStates();
    },
    setNodeAvailability,
    bundle: () => getBundle(),
    async close() {
      return shutdown.close();
    },
    async end() {
      return this.close();
    },
    telemetry,
  };
  return client;
}
