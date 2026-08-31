export function resolveManagedConfig({ endpoint, token, env = process.env } = {}) {
  return { endpoint: endpoint ?? env?.ELERA_API_URL, token: token ?? env?.ELERA_API_TOKEN };
}

export function createBundleFetcher({ endpoint, token, fetchImpl, fetchPath }) {
  return (targetEndpoint = endpoint) => fetchRoutingBundle({ endpoint: targetEndpoint, token, fetchImpl, path: fetchPath });
}
import { fetchRoutingBundle } from '../../routing/bundle-fetcher.mjs';
