import { routeFor } from "../../routing/index.mjs";
import { isSafeBalancedRetry as checkBalancedRetry } from "./retry-policy.mjs";

export function createRouteSelection({ primaryPool, balancedPool, routing }) {
  const choose = (sql, options = {}) =>
    options.connection ??
    (routeFor(sql, options.route ?? routing) === "balanced" && balancedPool
      ? balancedPool
      : primaryPool);
  const requestedRoute = (sql, options = {}) => routeFor(sql, options.route ?? routing);
  const isSafeBalancedRetry = (sql, options, error) =>
    checkBalancedRetry(sql, options, error, balancedPool, routing);
  return { choose, requestedRoute, isSafeBalancedRetry };
}
