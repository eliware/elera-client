
import { validateBundle } from '@eliware/elera-lib';
export function selectRouteNodes({ bundle, route = 'primary', now = Date.now() } = {}) {
  validateBundle(bundle); if (Date.parse(bundle.expiresAt) <= now) throw new TypeError('routing bundle is expired');
  const nodes = bundle.routes?.[route]; if (!Array.isArray(nodes) || nodes.length === 0) throw new TypeError(`routing bundle ${route} route is empty`);
  return nodes.map(({ host, port, weight }) => ({ host, port: Number(port), ...(weight === undefined ? {} : { weight: Number(weight) }) }));
}
