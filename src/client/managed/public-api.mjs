export function exposeManagedClient(client, end) {
  // Intentional mysql2 compatibility: getConnection() is writer-pinned so a
  // transaction cannot move between reader and writer routes.
  return Object.freeze({ query: client.query, execute: client.execute, getConnection: client.getConnection, probe: client.probe, end });
}
