import { probeClient } from "./probe.mjs";

export function createProbeApi({
  routeFor,
  execution,
  getPrimaryPool,
  getBalancedPool,
  routing = "auto",
}) {
  return (sql = "SELECT 1") =>
    probeClient({
      sql,
      routeFor: (statement) => {
        const route = routeFor(statement, routing);
        return route === "balanced" && !getBalancedPool?.() ? "primary" : route;
      },
      query: (statement, route) => execution.query(statement, undefined, { route }),
      getConnection: () => getPrimaryPool().choose().getConnection(),
    });
}
