import { expect, test, jest } from "@jest/globals";
import { createNodePool } from "../../src/pools/node-pool.mjs";
import { driver, profile } from "../../test-fixtures/node-pool.mjs";

test("node pool delegates queries, execution, health, connections, and close", async () => {
  const node = createNodePool({ profile, mysqlLib: driver(), log: { warn: jest.fn() } });
  await node.query("SELECT 1");
  await node.execute("SELECT 1");
  const acquired = await node.getConnection();
  acquired.release();
  acquired.release();
  await expect(node.health()).resolves.toMatchObject({ ok: true, host: "db" });
  await node.close();
});
test("node pool defaults options and toggles availability", async () => {
  const node = createNodePool({ profile, mysqlLib: driver() });
  expect(node.available).toBe(true);
  expect(node.failures).toBe(0);
  Object.getOwnPropertyDescriptor(node, "available").set.call(node, false);
  expect(node.available).toBe(false);
  node.available = true;
  expect(node.available).toBe(true);
});
test("manual exclusion remains effective past the failure quarantine interval", async () => {
  let now = 0;
  const node = createNodePool({ profile, mysqlLib: driver(), now: () => now, quarantineMs: 10 });
  node.available = false;
  now = 100;
  expect(node.available).toBe(false);
  node.available = true;
  expect(node.available).toBe(true);
});

test("quarantines failed operations and recovers after the deadline", async () => {
  let now = 0;
  const failure = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const mysqlLib = driver({
    query: jest.fn().mockRejectedValue(failure),
    execute: jest.fn().mockRejectedValue(failure),
    getConnection: jest.fn().mockRejectedValue(failure),
  });
  const node = createNodePool({
    profile,
    mysqlLib,
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
