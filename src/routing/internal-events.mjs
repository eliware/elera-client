export const ROUTING_RESYNC = 'routing.resync';

export function createRoutingResync({ version, bundle, receivedAt } = {}) {
  return { type: ROUTING_RESYNC, version, bundle, receivedAt };
}
