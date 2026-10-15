import { expect, test, jest } from "@jest/globals";
import { createNodePool } from "../../../src/pools/node/index.mjs";
import { driver, profile } from "../../../test-fixtures/pools/node.mjs";

test("node defaults and toggles availability", async () => {
  const node = createNodePool({ profile, mysqlLib: driver() });
  expect(node.available).toBe(true);
  expect(node.failures).toBe(0);
  node.available = false;
  expect(node.available).toBe(false);
  node.available = true;
  expect(node.available).toBe(true);
  await node.close();
});

test("keeps manual exclusion active after failure quarantine expires", async () => {
  let now = 0;
  const node = createNodePool({ profile, mysqlLib: driver(), now: () => now, quarantineMs: 10 });
  node.available = false;
  now = 100;
  expect(node.available).toBe(false);
  node.available = true;
  expect(node.available).toBe(true);
  await node.close();
});

test("node pool exposes connections, health, and close", async () => {
  const node = createNodePool({ profile, mysqlLib: driver(), log: { warn: jest.fn() } });
  const acquired = await node.getConnection();
  acquired.release();
  acquired.release();
  await expect(node.health()).resolves.toMatchObject({ ok: true, host: "db" });
  await node.close();
});
