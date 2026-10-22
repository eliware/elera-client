import { getWriterConnection } from "./connection.mjs";

export function exposeManagedClient(client, end) {
  return Object.freeze({
    query: client.query,
    execute: client.execute,
    getConnection: () => getWriterConnection(client),
    probe: client.probe,
    end,
  });
}
