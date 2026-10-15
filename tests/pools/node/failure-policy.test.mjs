import { expect, jest, test } from "@jest/globals";
import { createNodeFailurePolicy } from "../../../src/pools/node/failure-policy.mjs";
import { createNodePool } from "../../../src/pools/node/index.mjs";
import { driver, profile } from "../../../test-fixtures/pools/node.mjs";

test("classifies connection failures and sets the quarantine deadline", () => {
  const state = { unavailableUntil: 0 };
  const policy = createNodeFailurePolicy({ state, now: () => 5, quarantineMs: 10 });
  expect(policy.isRetryable(Object.assign(new Error("down"), { code: "ECONNREFUSED" }))).toBe(true);
  expect(policy.isRetryable(Object.assign(new Error("bad"), { code: "ER_PARSE_ERROR" }))).toBe(
    false,
  );
  policy.quarantine();
  expect(state.unavailableUntil).toBe(15);
  policy.clearQuarantine();
  expect(state.unavailableUntil).toBe(0);
});

test("applies retryable health failures to node availability", async () => {
  const failure = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const node = createNodePool({
    profile,
    mysqlLib: driver({ query: jest.fn().mockRejectedValue(failure) }),
  });
  await expect(node.health()).rejects.toThrow("down");
  expect(node.failures).toBe(1);
  expect(node.available).toBe(false);
  await node.close();
});

test("keeps node availability after a non-retryable health failure", async () => {
  const failure = Object.assign(new Error("invalid"), { code: "ER_PARSE_ERROR" });
  const node = createNodePool({
    profile,
    mysqlLib: driver({ query: jest.fn().mockRejectedValue(failure) }),
  });
  await expect(node.health()).rejects.toThrow("invalid");
  expect(node.failures).toBe(0);
  expect(node.available).toBe(true);
  await node.close();
});

test("quarantines failed operations and recovers after the deadline", async () => {
  let now = 0;
  const failure = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const mysqlLib = driver({
    query: jest.fn().mockRejectedValue(failure),
    execute: jest.fn().mockRejectedValue(failure),
    getConnection: jest.fn().mockRejectedValue(failure),
  });
  const node = createNodePool({ profile, mysqlLib, now: () => now, quarantineMs: 10 });
  await expect(node.query("SELECT 1")).rejects.toThrow();
  expect(node.available).toBe(false);
  await expect(node.execute("SELECT 1")).rejects.toThrow();
  await expect(node.getConnection()).rejects.toThrow();
  await expect(node.health()).rejects.toThrow();
  now = 11;
  expect(node.available).toBe(true);
  await node.close();
});
