export function getWriterConnection(client) {
  // The runtime client selects this connection from the primary pool.
  return client.getConnection();
}
