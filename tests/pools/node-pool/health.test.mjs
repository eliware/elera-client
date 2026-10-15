import { expect, jest, test } from "@jest/globals";
import { createNodeHealth } from "../../../src/pools/node-pool/health.mjs";

test("health clears node failures after a successful query", async () => {
  const state = { failures: 2, unavailableUntil: 10 };
  const health = createNodeHealth({
    profile: { host: "db", port: 3306 },
    pool: { query: jest.fn(async () => []) },
    state,
    isRetryable: () => false,
    quarantine: jest.fn(),
  });
  await expect(health()).resolves.toEqual({ ok: true, host: "db", port: 3306 });
  expect(state).toEqual({ failures: 0, unavailableUntil: 0 });
});

test("health quarantines retryable failures and maps the error", async () => {
  const failure = Object.assign(new Error("down"), { code: "ECONNREFUSED" });
  const state = { failures: 0, unavailableUntil: 0 };
  const quarantine = jest.fn(() => {
    state.unavailableUntil = 20;
  });
  const health = createNodeHealth({
    profile: { host: "db", port: 3306 },
    pool: {
      query: jest.fn(async () => {
        throw failure;
      }),
    },
    state,
    isRetryable: () => true,
    quarantine,
  });
  await expect(health()).rejects.toThrow("down");
  expect(state).toEqual({ failures: 1, unavailableUntil: 20 });
  expect(quarantine).toHaveBeenCalledTimes(1);
});

test("health does not quarantine non-retryable failures", async () => {
  const failure = Object.assign(new Error("invalid"), { code: "ER_PARSE_ERROR" });
  const state = { failures: 0, unavailableUntil: 0 };
  const quarantine = jest.fn();
  const health = createNodeHealth({
    profile: { host: "db", port: 3306 },
    pool: {
      query: jest.fn(async () => {
        throw failure;
      }),
    },
    state,
    isRetryable: () => false,
    quarantine,
  });
  await expect(health()).rejects.toThrow("invalid");
  expect(state.failures).toBe(0);
  expect(quarantine).not.toHaveBeenCalled();
});
