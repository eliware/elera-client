
import { createDbFromBundle } from '../from-bundle.mjs';
import { createRoutingStream } from '../../routing/stream-client/index.mjs';
import { resolveManagedConfig, createBundleFetcher } from './configuration.mjs';
import { exposeManagedClient } from './public-api.mjs';

export async function createDb({ endpoint, token, env = process.env, fetchImpl = globalThis.fetch, fetchPath, WebSocketImpl = globalThis.WebSocket, mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry = true } = {}) {
  ({ endpoint, token } = resolveManagedConfig({ endpoint, token, env }));
  const fetchBundle = createBundleFetcher({ endpoint, token, fetchImpl, fetchPath });
  const bundle = await fetchBundle();
  const stream = createRoutingStream({ endpoint, token, fetchBundle, WebSocketImpl, log, now, telemetry });
  const tokenContext = { application: bundle.application, database: bundle.database, credentialName: bundle.credentialName, identity: bundle.identity, scopes: bundle.scopes };
  const client = await createDbFromBundle({ bundle, tokenContext, mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry });
  const detach = await client.attachRoutingStream(stream);
  const close = client.close.bind(client);
  const end = async () => { await detach?.(); await close(); };
  return exposeManagedClient(client, end);
}
