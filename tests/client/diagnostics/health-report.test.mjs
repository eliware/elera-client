import { expect, test } from "@jest/globals";
import { createHealthReport } from "../../../src/client/diagnostics/health-report.mjs";

test("reports health, selected route, and latency", async () => {
  const now = jestSequence();
  const report = await createHealthReport({
    route: "balanced",
    getPrimaryPool: () => ({ health: async () => [{ ok: false }] }),
    getBalancedPool: () => ({ health: async () => [{ ok: true }] }),
    now,
  });
  expect(report).toEqual({ ok: true, route: "balanced", nodes: [{ ok: true }], latencyMs: 1 });
});

function jestSequence() {
  let value = 0;
  return () => ++value;
}
