import { expect, test } from "@jest/globals";
import { isSafeBalancedRetry } from "../../../src/client/routing/retry-policy.mjs";

const pool = {};

test("allows retry for a retryable balanced read", () => {
  expect(isSafeBalancedRetry("SELECT 1", {}, { retryable: true }, pool, "auto")).toBe(true);
});

test.each([
  ["UPDATE items SET value = 1", {}, { retryable: true }, pool, "auto"],
  ["SELECT 1", { route: "primary" }, { retryable: true }, pool, "auto"],
  ["SELECT 1", {}, { retryable: false }, pool, "auto"],
  ["SELECT 1", {}, { retryable: true }, null, "auto"],
])("rejects unsafe retry request %s", (sql, options, error, balancedPool, routing) => {
  expect(isSafeBalancedRetry(sql, options, error, balancedPool, routing)).toBe(false);
});
