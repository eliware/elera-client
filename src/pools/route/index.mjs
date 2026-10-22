import { ClusterUnavailableError, ServerUnavailableError } from "../../errors/index.mjs";
import { createNodeSelector } from "./selection.mjs";
import { createPoolLifecycle } from "./lifecycle.mjs";
import { createPoolHealth } from "./health.mjs";
import { createPoolOperations } from "./operations.mjs";

export function createRoutePool(
  nodes,
  {
    preferred = false,
    unavailableError = nodes.length === 1 ? ServerUnavailableError : ClusterUnavailableError,
  } = {},
) {
  const { choose } = createNodeSelector(nodes, { preferred, unavailableError });
  const lifecycle = createPoolLifecycle(nodes);
  const operations = createPoolOperations(choose);
  const health = createPoolHealth(nodes);
  return { nodes, choose, ...lifecycle, ...operations, health };
}
