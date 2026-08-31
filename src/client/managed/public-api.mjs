export function exposeManagedClient(client, end) {
  return Object.freeze({ query: client.query, execute: client.execute, getConnection: client.getConnection, probe: client.probe, end });
}
