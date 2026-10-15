import { verifyProbeTransaction } from "./transaction-probe.mjs";

export async function probeClient({ sql = "SELECT 1", routeFor, query, getConnection }) {
  const route = routeFor(sql);
  const result = await query(sql, route);
  await verifyProbeTransaction(getConnection);
  return {
    ok: true,
    route,
    result,
    transaction: "started",
    released: true,
  };
}
