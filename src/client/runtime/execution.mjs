import { routeFor } from "../../routing/index.mjs";
import { createExecute } from "../routing/execute.mjs";
import { createQueryExecution } from "../routing/query-execution.mjs";
import { createQuery } from "../routing/query.mjs";

export function createDbExecution({ metrics, getBalancedPool, selection, timed, routing, log }) {
  const run = createQueryExecution({ selection, timed, routeFor, routing, log });
  return {
    query: createQuery({ run, metrics, getBalancedPool }),
    execute: createExecute({ run }),
  };
}
