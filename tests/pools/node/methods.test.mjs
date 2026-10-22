import { expect, test, jest } from "@jest/globals";
import { createNodeMethods } from "../../../src/pools/node/methods.mjs";
import { createNodeFailurePolicy } from "../../../src/pools/node/failure-policy.mjs";
import { profile } from "../../../test-fixtures/pools/node.mjs";

test("delegates node query and execute operations", async () => {
  const operations = { query: async () => ["rows"], execute: async () => ["result"] };
  const state = { failures: 0, unavailableUntil: 0 };
  const failurePolicy = createNodeFailurePolicy({ state, now: () => 1, quarantineMs: 10 });
  const methods = createNodeMethods({
    profile: { host: "db", port: 3306 },
    operations,
    state,
    ...failurePolicy,
    isAvailable: () => true,
  });
  await expect(methods.query("SELECT 1")).resolves.toEqual(["rows"]);
  await expect(methods.execute("SELECT 1")).resolves.toEqual(["result"]);
});

test("quarantines retryable execute failures", async () => {
  const failure = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const makeMethods = ({ execute }) => {
    const state = { failures: 0, unavailableUntil: 0 };
    const failurePolicy = createNodeFailurePolicy({ state, now: () => 1, quarantineMs: 10 });
    const warn = jest.fn();
    const methods = createNodeMethods({
      profile,
      operations: { query: jest.fn(), execute },
      state,
      log: { warn },
      ...failurePolicy,
      isAvailable: () => true,
    });
    return { methods, state, warn };
  };
  const execute = makeMethods({ execute: jest.fn().mockRejectedValue(failure) });
  await expect(execute.methods.execute("SELECT 1")).rejects.toThrow("down");
  expect(execute.state).toEqual({ failures: 1, unavailableUntil: 11 });
  expect(execute.warn).toHaveBeenCalled();
});

test("maps non-retryable requests without quarantining the node", async () => {
  const failure = Object.assign(new Error("invalid"), { code: "ER_PARSE_ERROR" });
  const state = { failures: 0, unavailableUntil: 0 };
  const failurePolicy = createNodeFailurePolicy({ state, now: () => 1, quarantineMs: 10 });
  const methods = createNodeMethods({
    profile,
    operations: {
      query: jest.fn().mockRejectedValue(failure),
      execute: jest.fn().mockRejectedValue(failure),
    },
    state,
    ...failurePolicy,
    isAvailable: () => true,
  });
  await expect(methods.query("BAD")).rejects.toThrow("invalid");
  await expect(methods.execute("BAD")).rejects.toThrow("invalid");
  expect(state).toEqual({ failures: 0, unavailableUntil: 0 });
});
