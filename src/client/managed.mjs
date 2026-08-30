
import { createDbFromBundle } from './from-bundle.mjs';
import { fetchRoutingBundle } from '../routing/bundle-fetcher.mjs';
import { createRoutingStream } from '../routing/stream-client.mjs';

export async function createDb({ endpoint = process.env.ELERA_API_ENDPOINT, token = process.env.ELERA_API_TOKEN, fetchImpl = globalThis.fetch, fetchPath, WebSocketImpl = globalThis.WebSocket, primary, balanced, credentialProvider, identity, tokenContext: legacyTokenContext, ...options } = {}) {
  if (primary !== undefined || balanced !== undefined || credentialProvider !== undefined || identity !== undefined || legacyTokenContext !== undefined) {
    throw new TypeError('createDb accepts only endpoint and token application configuration');
  }
  const fetchBundle = (targetEndpoint = endpoint) => fetchRoutingBundle({ endpoint: targetEndpoint, token, fetchImpl, path: fetchPath });
  const bundle = await fetchBundle();
  const stream = createRoutingStream({ endpoint, token, fetchBundle, WebSocketImpl, ...options });
  const tokenContext = { application: bundle.application, database: bundle.database, credentialName: bundle.credentialName, identity: bundle.identity, scopes: bundle.scopes };
  const client = await createDbFromBundle({ bundle, tokenContext, ...options });
  const detach = await client.attachRoutingStream(stream);
  const close = client.close.bind(client);
  client.close = async () => { await detach?.(); await close(); };
  return client;
}
