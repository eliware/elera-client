import { expect, jest, test } from "@jest/globals";
import { probeClient } from "../../../src/client/diagnostics/probe.mjs";

test("reports query and transaction checks and releases the connection", async () => {
  const routeFor = jest.fn(() => "balanced");
  const query = jest.fn(async () => ["rows"]);
  const getConnection = jest.fn(async () => connection);
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const result = await probeClient({
    routeFor,
    query,
    getConnection,
  });
  expect(result).toEqual({
    ok: true,
    route: "balanced",
    result: ["rows"],
    transaction: "started",
    released: true,
  });
  expect(routeFor).toHaveBeenCalledWith("SELECT 1");
  expect(query).toHaveBeenCalledWith("SELECT 1", "balanced");
  expect(getConnection).toHaveBeenCalledWith();
});
