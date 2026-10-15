import { createNodePool as createNode } from "./pools/node-pool.mjs";
import { createRoutePool as createRoute } from "./pools/route-pool/index.mjs";

export function createNodePool(options) {
  return createNode(options);
}

export function createRoutePool(nodes, options) {
  return createRoute(nodes, options);
}
