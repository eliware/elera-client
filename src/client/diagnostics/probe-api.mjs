import { probeClient } from "./probe.mjs";

export function createProbeApi({ routeFor, execution, getPrimaryPool, routing = "auto" }) {
  return (sql = "SELECT 1") =>
    probeClient({
      sql,
      routeFor: (statement) => routeFor(statement, routing),
      query: (statement, route) => execution.query(statement, undefined, { route }),
      getConnection: () => getPrimaryPool().choose().getConnection(),
    });
}
