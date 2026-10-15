import { expect, jest, test } from "@jest/globals";
import { createClientApi } from "../../../src/client/create-db/public-api.mjs";

test("exposes client operations through the supplied services", async () => {
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const node = { getConnection: async () => connection };
  const pool = {
    choose: () => node,
    drain: jest.fn(),
    waitForIdle: jest.fn(async () => true),
    forceClose: jest.fn(async () => true),
    setAvailability: jest.fn(),
  };
  const diagnostics = {
    health: jest.fn(async () => ({ ok: true })),
    availability: jest.fn(() => ({ state: "available" })),
    nodeStates: jest.fn(() => []),
  };
  const shutdown = { close: jest.fn(async () => {}) };
  const client = createClientApi({
    execution: { query: async () => ["rows"], execute: async () => ["result"] },
    transaction: async (callback) => callback("transaction"),
    diagnostics,
    refreshBundle: async (bundle) => bundle,
    shutdown,
    routeFor: () => "primary",
    getPrimaryPool: () => pool,
    getBundle: () => ({ bundleVersion: 1 }),
    setNodeAvailability: jest.fn(),
    attachRoutingStream: async (_stream, api) => api,
    drain: () => ({ wait: async () => true, forceClose: async () => true }),
    telemetry: undefined,
  });
  await expect(client.query("SELECT 1")).resolves.toEqual(["rows"]);
  await expect(client.execute("UPDATE t SET x=1")).resolves.toEqual(["result"]);
  await expect(client.probe()).resolves.toMatchObject({ ok: true, released: true });
  await expect(client.transaction((value) => value)).resolves.toBe("transaction");
  await expect(client.health()).resolves.toEqual({ ok: true });
  await expect(client.refresh({ bundleVersion: 2 })).resolves.toEqual({ bundleVersion: 2 });
  await expect(client.attachRoutingStream({})).resolves.toBe(client);
  await expect(client.drain("db").wait()).resolves.toBe(true);
  await expect(client.drain("db").forceClose()).resolves.toBe(true);
  expect(client.availability()).toEqual({ state: "available" });
  expect(client.nodeStates()).toEqual([]);
  expect(client.bundle()).toEqual({ bundleVersion: 1 });
  await client.close();
  await client.end();
  expect(shutdown.close).toHaveBeenCalledTimes(2);
});
