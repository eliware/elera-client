import { expect, test } from "@jest/globals";
import { createDiagnostics } from "../../../src/client/create-db/diagnostics.mjs";

test("reports node states and route availability from pool state", async () => {
  const primary = {
    nodes: [{ host: "db", port: 3306, state: "ready", active: 0, available: true }],
    health: async () => [{ ok: true }],
  };
  const diagnostics = createDiagnostics({
    getPools: () => [primary],
    getPrimaryPool: () => primary,
    getBalancedPool: () => null,
    now: () => 0,
  });
  expect(diagnostics.nodeStates()).toMatchObject([{ route: "primary", host: "db" }]);
  expect(diagnostics.availability()).toEqual({
    state: "available",
    routes: { primary: true, balanced: false },
  });
  await expect(diagnostics.health()).resolves.toMatchObject({ ok: true, route: "primary" });
});
