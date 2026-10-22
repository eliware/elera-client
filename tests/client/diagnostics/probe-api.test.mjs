import { expect, jest, test } from "@jest/globals";
import { createProbeApi } from "../../../src/client/diagnostics/probe-api.mjs";

test.each([undefined, "primary"])(
  "adapts query and connection methods for %s routing",
  async (routing) => {
    const query = jest.fn(async () => []);
    const connection = {
      beginTransaction: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    const routeFor = jest.fn((_sql, configured) =>
      configured === "auto" ? "primary" : configured,
    );
    await createProbeApi({
      routeFor,
      execution: { query },
      getPrimaryPool: () => ({ choose: () => ({ getConnection: async () => connection }) }),
      routing,
    })();
    expect(routeFor).toHaveBeenCalledWith("SELECT 1", routing ?? "auto");
    expect(query).toHaveBeenCalledWith("SELECT 1", undefined, { route: "primary" });
  },
);

test.each([
  [false, "primary"],
  [true, "balanced"],
])("uses %s balanced-pool availability to report %s", async (hasBalancedPool, expectedRoute) => {
  const query = jest.fn(async () => []);
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  await createProbeApi({
    routeFor: () => "balanced",
    execution: { query },
    getPrimaryPool: () => ({ choose: () => ({ getConnection: async () => connection }) }),
    getBalancedPool: () => (hasBalancedPool ? {} : undefined),
  })();
  expect(query).toHaveBeenCalledWith("SELECT 1", undefined, { route: expectedRoute });
});
