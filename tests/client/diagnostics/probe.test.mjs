import { expect, test } from "@jest/globals";
import { probeClient } from "../../../src/client/diagnostics/probe.mjs";

test("reports query and transaction checks and releases the connection", async () => {
  const connection = {
    beginTransaction: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  const result = await probeClient({
    routeFor: () => "balanced",
    query: async () => ["rows"],
    getConnection: async () => connection,
  });
  expect(result).toEqual({
    ok: true,
    route: "balanced",
    result: ["rows"],
    transaction: "started",
    released: true,
  });
});
