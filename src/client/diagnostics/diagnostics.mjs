import { getAvailability } from "./availability.mjs";
import { createHealthReport } from "./health-report.mjs";
import { getNodeStates } from "./node-states.mjs";

export function createDiagnostics({ getPools, getPrimaryPool, getBalancedPool, now }) {
  const nodeStates = () => getNodeStates({ getPools, getPrimaryPool });
  return {
    health: (route = "primary") =>
      createHealthReport({ route, getPrimaryPool, getBalancedPool, now }),
    nodeStates,
    availability: () => getAvailability(nodeStates()),
  };
}
