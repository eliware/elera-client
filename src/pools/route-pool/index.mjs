
import { ClusterUnavailableError, ServerUnavailableError } from '../../errors.mjs';
import { createNodeSelector } from './selection.mjs';
import { createPoolLifecycle } from './lifecycle.mjs';
import { createPoolHealth } from './health.mjs';
import { createPoolDelegation } from './delegation.mjs';

export function createRoutePool(nodes, { preferred = false, unavailableError = nodes.length === 1 ? ServerUnavailableError : ClusterUnavailableError } = {}) {
  const { choose } = createNodeSelector(nodes, { preferred, unavailableError });
  const lifecycle = createPoolLifecycle(nodes);
  const delegation = createPoolDelegation(choose);
  const health = createPoolHealth(nodes);
  return { nodes, choose, ...lifecycle, ...delegation, health };
}
