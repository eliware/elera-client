import { expect, test } from "@jest/globals";
import { createNodeFailurePolicy } from "../../../src/pools/node-pool/failure-policy.mjs";

test("classifies connection failures and sets the quarantine deadline", () => {
  const state = { unavailableUntil: 0 };
  const policy = createNodeFailurePolicy({ state, now: () => 5, quarantineMs: 10 });
  expect(policy.isRetryable(Object.assign(new Error("down"), { code: "ECONNREFUSED" }))).toBe(true);
  expect(policy.isRetryable(Object.assign(new Error("bad"), { code: "ER_PARSE_ERROR" }))).toBe(
    false,
  );
  policy.quarantine();
  expect(state.unavailableUntil).toBe(15);
});
