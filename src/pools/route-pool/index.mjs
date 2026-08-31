
import { ClusterUnavailableError, ServerUnavailableError } from '../../errors.mjs';
import { createNodeSelector } from './selection.mjs';
import { createPoolLifecycle } from './lifecycle.mjs';
import { createPoolHealth } from './health.mjs';

export function createRoutePool(nodes, { preferred = false, unavailableError = nodes.length === 1 ? ServerUnavailableError : ClusterUnavailableError } = {}) {
  const { choose } = createNodeSelector(nodes, { preferred, unavailableError });
  const lifecycle = createPoolLifecycle(nodes);
  const query = (sql, values) => choose().query(sql, values);
  const execute = (sql, values) => choose().execute(sql, values);
  const health = createPoolHealth(nodes);
  return { nodes, choose, ...lifecycle, query, execute, health };
}
