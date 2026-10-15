import { expect, test, jest } from "@jest/globals";
import { createNodePool } from "../../src/pools/node-pool.mjs";
import { connection, driver, profile } from "../../test-fixtures/node-pool.mjs";

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
test("node pool executes session setup and handles execute, connection, and health failures", async () => {
  const bad = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const conn = connection();
  const pool = driver({ getConnection: jest.fn(async () => conn) });
  const node = createNodePool({
    profile: { ...profile, options: { sessionStatements: ["SET x=1"] } },
    mysqlLib: pool,
  });
  await node.query("SELECT 1");
  await node.execute("SELECT 1");
  conn.execute.mockRejectedValueOnce(bad);
  await expect(node.execute("SELECT 1")).rejects.toThrow();
  const failing = driver({
    getConnection: jest.fn(async () => {
      throw bad;
    }),
    query: jest.fn(async () => {
      throw bad;
    }),
  });
  const other = createNodePool({ profile, mysqlLib: failing });
  await expect(other.getConnection()).rejects.toThrow();
  await expect(other.health()).rejects.toThrow();
});
test("node pool handles non-retryable execute, connection, and health failures", async () => {
  const bad = Object.assign(new Error("invalid"), { code: "ER_PARSE_ERROR" });
  const executePool = driver({
    execute: jest.fn(async () => {
      throw bad;
    }),
  });
  await expect(createNodePool({ profile, mysqlLib: executePool }).execute("BAD")).rejects.toThrow();
  const connectionPool = driver({
    getConnection: jest.fn(async () => {
      throw bad;
    }),
  });
  await expect(
    createNodePool({ profile, mysqlLib: connectionPool }).getConnection(),
  ).rejects.toThrow();
  const healthPool = driver({
    query: jest.fn(async () => {
      throw bad;
    }),
  });
  await expect(createNodePool({ profile, mysqlLib: healthPool }).health()).rejects.toThrow();
});

test("query quarantines retryable failures without requiring a logger", async () => {
  const bad = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const node = createNodePool({
    profile,
    mysqlLib: driver({
      query: jest.fn(async () => {
        throw bad;
      }),
    }),
  });
  await expect(node.query("SELECT 1")).rejects.toThrow("down");
  expect(node.failures).toBe(1);
});

test("close is idempotent and closed nodes cannot recover", async () => {
  const end = jest.fn(async () => {});
  const node = createNodePool({
    profile,
    mysqlLib: {
      createPool: () => ({
        query: jest.fn(async () => [[]]),
        execute: jest.fn(async () => [[]]),
        getConnection: jest.fn(async () => ({})),
        end,
      }),
    },
  });
  await node.close();
  await node.close();
  expect(end).toHaveBeenCalledTimes(1);
  expect(node.recover()).toBe("unavailable");
  node.available = true;
  expect(node.available).toBe(false);
});

test("query maps non-retryable failures without quarantining the node", async () => {
  const bad = Object.assign(new Error("invalid"), { code: "ER_PARSE_ERROR" });
  const node = createNodePool({
    profile,
    mysqlLib: driver({
      query: jest.fn(async () => {
        throw bad;
      }),
    }),
  });
  await expect(node.query("BAD")).rejects.toThrow("invalid");
  expect(node.failures).toBe(0);
  expect(node.available).toBe(true);
});
