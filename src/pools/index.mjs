import { createNodePool as createNode } from "./node/index.mjs";
import { createRoutePool as createRoute } from "./route/index.mjs";

export function createNodePool(options) {
  return createNode(options);
}

export function createRoutePool(nodes, options) {
  return createRoute(nodes, options);
}
