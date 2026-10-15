import { expect, jest, test } from "@jest/globals";
import { createProbeApi, probeClient } from "../../../src/client/diagnostics/probe.mjs";

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

test("releases the connection when the transaction check fails", async () => {
  const connection = {
    beginTransaction: jest.fn(async () => {
      throw new Error("transaction failed");
    }),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  await expect(
    probeClient({
      routeFor: () => "primary",
      query: async () => [],
      getConnection: async () => connection,
    }),
  ).rejects.toThrow("transaction failed");
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test("adapts client query and connection operations to the default probe request", async () => {
  const query = jest.fn(async () => ["rows"]);
  const execution = { query };
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const probe = createProbeApi({
    routeFor: jest.fn(() => "primary"),
    execution,
    getPrimaryPool: () => ({ choose: () => ({ getConnection: async () => connection }) }),
  });
  await expect(probe()).resolves.toMatchObject({ ok: true, result: ["rows"] });
  expect(query).toHaveBeenCalledWith("SELECT 1");
});
