
import { validateBundle } from '@eliware/elera-lib';

const DEFAULT_BUNDLE_PATH = '/api/v1/routing/bundle';

function bundleUrl(endpoint, path) {
  if (!endpoint) throw new TypeError('Elera API endpoint is required');
  return new URL(path, endpoint.endsWith('/') ? endpoint : `${endpoint}/`).toString();
}

export async function fetchRoutingBundle({ endpoint, token, path, fetchImpl, signal } = {}) {
  if (!token) throw new TypeError('Elera API token is required');
  const request = fetchImpl === undefined ? globalThis.fetch : fetchImpl;
  if (typeof request !== 'function') throw new TypeError('fetch implementation is required');
  const response = await request(bundleUrl(endpoint, path ?? DEFAULT_BUNDLE_PATH), { method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${token}` }, signal });
  if (!response?.ok) throw new Error(`routing bundle request failed with HTTP ${response?.status ?? 0}`);
  let bundle;
  try { bundle = await response.json(); } catch (error) { throw new Error('routing bundle response was not valid JSON', { cause: error }); }
  return validateBundle(bundle);
}

export { DEFAULT_BUNDLE_PATH };
