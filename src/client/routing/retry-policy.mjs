import { classifyQuery, routeFor } from "../../routing/index.mjs";

export function isSafeBalancedRetry(sql, options, error, balancedPool, routing) {
  return Boolean(
    error?.retryable &&
    balancedPool &&
    routeFor(sql, options?.route ?? routing) === "balanced" &&
    classifyQuery(sql) === "balanced",
  );
}
