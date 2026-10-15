import { createNodePool as createNode } from "./pools/node/index.mjs";
import { createRoutePool as createRoute } from "./pools/route/index.mjs";

export function createNodePool(options) {
  return createNode(options);
}

export function createRoutePool(nodes, options) {
  return createRoute(nodes, options);
}
