export function createClientApi({ execution, transaction, diagnostics, refreshBundle, shutdown, routeFor, getPrimaryPool, getBalancedPool, getBundle, setNodeAvailability, attachRoutingStream, drain, telemetry }) {
  const client = {
    async query(sql, values, options) { return execution.query(sql, values, options); },
    async execute(sql, values, options) { return execution.execute(sql, values, options); },
    // Intentional diagnostic contract: the query route and transaction route are
    // reported separately by their operations; probe only promises that both
    // checks completed without error, not that they used the same connection.
    async probe(sql = 'SELECT 1') { const route = routeFor(sql); const result = await client.query(sql); let connection; let transactionState = 'started'; try { connection = await client.getConnection(); await connection.beginTransaction(); await connection.rollback(); } finally { connection?.release?.(); } return { ok: true, route, result, transaction: transactionState, released: Boolean(connection) }; },
    async transaction(callback) { return transaction(callback); },
    async getConnection() { return getPrimaryPool().choose().getConnection(); },
    async health(route = 'primary') { return diagnostics.health(route); },
    async refresh(nextBundle) { return refreshBundle(nextBundle); },
    async attachRoutingStream(stream) { return attachRoutingStream(stream, client); },
    drain,
    availability() { return diagnostics.availability(); },
    nodeStates() { return diagnostics.nodeStates(); },
    setNodeAvailability,
    bundle: () => getBundle(),
    async close() { return shutdown.close(); },
    async end() { return this.close(); },
    telemetry
  };
  return client;
}
