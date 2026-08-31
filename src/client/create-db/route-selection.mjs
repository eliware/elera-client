import { classifyQuery, routeFor } from '../../routing.mjs';

export function createRouteSelection({ primaryPool, balancedPool, routing }) {
  const choose = (sql, options = {}) => options.connection ?? (routeFor(sql, options.route ?? routing) === 'balanced' && balancedPool ? balancedPool : primaryPool);
  const requestedRoute = (sql, options = {}) => routeFor(sql, options.route ?? routing);
  const isSafeBalancedRetry = (sql, options, error) => Boolean(error?.retryable && balancedPool && requestedRoute(sql, options) === 'balanced' && classifyQuery(sql) === 'balanced');
  return { choose, requestedRoute, isSafeBalancedRetry };
}
