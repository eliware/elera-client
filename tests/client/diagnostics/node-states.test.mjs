import { expect, test } from "@jest/globals";
import { getNodeStates } from "../../../src/client/diagnostics/node-states.mjs";

test("projects node fields and route names", () => {
  const primary = {
    nodes: [{ host: "db", port: 3306, state: "ready", active: 2, available: true }],
  };
  const balanced = {
    nodes: [{ host: "read", port: 3307, state: "draining", active: 1, available: false }],
  };
  expect(
    getNodeStates({ getPools: () => [primary, balanced], getPrimaryPool: () => primary }),
  ).toEqual([
    { host: "db", port: 3306, route: "primary", state: "ready", active: 2, available: true },
    { host: "read", port: 3307, route: "balanced", state: "draining", active: 1, available: false },
  ]);
});
