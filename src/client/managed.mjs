
import { createDbFromBundle } from './from-bundle.mjs';
import { fetchRoutingBundle } from '../routing/bundle-fetcher.mjs';
import { createRoutingStream } from '../routing/stream-client.mjs';

export async function createDb({ endpoint, token, env = process.env, fetchImpl = globalThis.fetch, fetchPath, WebSocketImpl = globalThis.WebSocket, mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry } = {}) {
  endpoint ??= env?.ELERA_API_URL;
  token ??= env?.ELERA_API_TOKEN;
  const fetchBundle = (targetEndpoint = endpoint) => fetchRoutingBundle({ endpoint: targetEndpoint, token, fetchImpl, path: fetchPath });
  const bundle = await fetchBundle();
  const stream = createRoutingStream({ endpoint, token, fetchBundle, WebSocketImpl, log, now, telemetry });
  const tokenContext = { application: bundle.application, database: bundle.database, credentialName: bundle.credentialName, identity: bundle.identity, scopes: bundle.scopes };
  const client = await createDbFromBundle({ bundle, tokenContext, mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry });
  const detach = await client.attachRoutingStream(stream);
  const close = client.close.bind(client);
  const end = async () => { await detach?.(); await close(); };
  return Object.freeze({
    query: client.query,
    execute: client.execute,
    getConnection: client.getConnection,
    end
  });
}
