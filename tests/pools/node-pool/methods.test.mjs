import { expect, test, jest } from "@jest/globals";
import { createNodeMethods } from "../../../src/pools/node-pool/methods.mjs";
import { createNodePool } from "../../../src/pools/node-pool.mjs";
import { driver, profile } from "../../../test-fixtures/node-pool.mjs";

test("delegates node requests and connection lifecycle", async () => {
  const connection = { release: jest.fn() };
  const pool = {
    getConnection: async () => connection,
    query: async () => [],
  };
  const operations = { query: async () => ["rows"], execute: async () => ["result"] };
  const lifecycle = { begin: jest.fn(), end: jest.fn() };
  const state = { failures: 0, unavailableUntil: 0 };
  const methods = createNodeMethods({
    profile: { host: "db", port: 3306 },
    pool,
    operations,
    lifecycle,
    state,
    now: () => 1,
    quarantineMs: 10,
    isAvailable: () => true,
  });
  await expect(methods.query("SELECT 1")).resolves.toEqual(["rows"]);
  await expect(methods.execute("SELECT 1")).resolves.toEqual(["result"]);
  const acquired = await methods.getConnection();
  acquired.release();
  expect(lifecycle.begin).toHaveBeenCalledTimes(1);
  expect(lifecycle.end).toHaveBeenCalledTimes(1);
});

test("quarantines retryable requests and recovers after the deadline", async () => {
  let now = 0;
  const failure = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const mysqlLib = driver({
    query: jest.fn(async () => {
      throw failure;
    }),
    execute: jest.fn(async () => {
      throw failure;
    }),
    getConnection: jest.fn(async () => {
      throw failure;
    }),
  });
  const node = createNodePool({
    profile: { ...profile, options: { sessionStatements: ["SET x=1"] } },
    mysqlLib,
    log: { warn: jest.fn() },
    now: () => now,
    quarantineMs: 10,
  });
  await expect(node.query("SELECT 1")).rejects.toThrow();
  expect(node.available).toBe(false);
  await expect(node.execute("SELECT 1")).rejects.toThrow();
  await expect(node.getConnection()).rejects.toThrow();
  await expect(node.health()).rejects.toThrow();
  now = 11;
  expect(node.available).toBe(true);
});
