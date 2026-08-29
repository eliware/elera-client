
import { validateRoutingNode } from '@eliware/elera-lib';

export function bundleProfiles(bundle, route, base) {
  if (route === 'primary' && bundle.writer?.host) return [bundle.writer, ...(bundle.failover ?? [])].map((node, index) => { const valid = validateRoutingNode(node, `primary assignment[${index}]`); return { ...base, host: valid.host, port: valid.port, weight: valid.weight }; });
  const nodes = route === 'balanced' && bundle.readers?.length ? bundle.readers : bundle.routes?.[route] ?? [];
  return nodes.map((node) => { const valid = validateRoutingNode(node, `${route} route node`); return { ...base, host: valid.host, port: valid.port, weight: valid.weight }; });
}
