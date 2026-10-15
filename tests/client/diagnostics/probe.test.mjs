import { expect, jest, test } from "@jest/globals";
import { probeClient } from "../../../src/client/diagnostics/probe.mjs";

test("reports query and transaction checks and releases the connection", async () => {
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const result = await probeClient({
    routeFor: jest.fn(() => "balanced"),
    query: jest.fn(async () => ["rows"]),
    getConnection: jest.fn(async () => connection),
  });
  expect(result).toEqual({
    ok: true,
    route: "balanced",
    result: ["rows"],
    transaction: "started",
    released: true,
  });
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
});
