import { expect, jest, test } from "@jest/globals";
import { createNodeLifecycle } from "../../../src/pools/node-pool/lifecycle.mjs";
import { createNodePool } from "../../../src/pools/node-pool.mjs";
import { connection, driver, profile } from "../../../test-fixtures/node-pool.mjs";

test("tracks availability, drain, recovery, and forced closure", async () => {
  const forceClose = jest.fn();
  const lifecycle = createNodeLifecycle({ now: () => 1, onForceClose: forceClose, timeoutMs: 1 });
  expect(lifecycle.available).toBe(true);
  lifecycle.unavailable = true;
  expect(lifecycle.available).toBe(false);
  lifecycle.unavailable = false;
  expect(lifecycle.available).toBe(true);
  lifecycle.begin();
  const idle = lifecycle.waitForIdle(10);
  lifecycle.end();
  await expect(idle).resolves.toBe(true);
  lifecycle.drain(1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(forceClose).toHaveBeenCalled();
  lifecycle.recover();
  lifecycle.clear();
});

test("tracks active work and drains before force-closing", async () => {
  let resolveQuery;
  const query = new Promise((resolve) => {
    resolveQuery = resolve;
  });
  const end = jest.fn(async () => {});
  const node = createNodePool({ profile, mysqlLib: driver({ query: jest.fn(() => query), end }) });
  const running = node.query("SELECT SLEEP(1)");
  expect(node.active).toBe(1);
  expect(node.drain().state).toBe("draining");
  expect(node.available).toBe(false);
  await expect(node.query("SELECT 1")).rejects.toThrow("unavailable");
  const idle = node.waitForIdle(1000);
  resolveQuery([["ok"]]);
  await running;
  await expect(idle).resolves.toBe(true);
  node.recover();
  expect(node.state).toBe("ready");
  await node.forceClose();
  expect(end).toHaveBeenCalled();
});

test("waits for every active request before idle resolves", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const node = createNodePool({ profile, mysqlLib: driver({ query: jest.fn(() => pending) }) });
  const first = node.query("SELECT 1");
  const second = node.query("SELECT 2");
  const idle = node.waitForIdle(1);
  release([["ok"]]);
  await Promise.all([first, second]);
  await idle;
});

test("force-closes after the drain deadline and protects release accounting", async () => {
  const end = jest.fn(async () => {});
  const conn = connection();
  const node = createNodePool({
    profile,
    mysqlLib: driver({ end, getConnection: jest.fn(async () => conn) }),
  });
  const acquired = await node.getConnection();
  expect(node.active).toBe(1);
  acquired.release();
  acquired.release();
  expect(node.active).toBe(0);
  node.drain(0);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(end).toHaveBeenCalled();
  await expect(node.waitForIdle()).resolves.toBe(true);
});

test("keeps a closed node unavailable after repeated close and recovery", async () => {
  const end = jest.fn(async () => {});
  const node = createNodePool({
    profile,
    mysqlLib: driver({ end }),
  });
  await node.close();
  await node.close();
  expect(node.recover()).toBe("unavailable");
  node.available = true;
  expect(node.available).toBe(false);
  expect(end).toHaveBeenCalledTimes(1);
});
