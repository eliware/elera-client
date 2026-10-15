import { expect, jest, test } from "@jest/globals";
import { createProbeApi } from "../../../src/client/diagnostics/probe-api.mjs";

test("adapts query and connection methods with default and configured routing", async () => {
  for (const routing of [undefined, "primary"]) {
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
  }
});
