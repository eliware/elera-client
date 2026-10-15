import { createRouteSelection } from "./route-selection.mjs";

export function createPoolSelection({ getPrimaryPool, getBalancedPool, routing }) {
  return () =>
    createRouteSelection({
      primaryPool: getPrimaryPool(),
      balancedPool: getBalancedPool(),
      routing,
    });
}
