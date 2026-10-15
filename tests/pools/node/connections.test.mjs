import { expect, jest, test } from "@jest/globals";
import { createNodeConnections } from "../../../src/pools/node/connections.mjs";

test("maps acquisition errors and quarantines retryable failures", async () => {
  const error = Object.assign(new Error("offline"), { code: "ECONNREFUSED" });
  const quarantine = jest.fn();
  const connections = createNodeConnections({
    profile: { host: "db" },
    pool: { getConnection: jest.fn().mockRejectedValue(error) },
    lifecycle: { begin: jest.fn(), end: jest.fn() },
    isRetryable: () => true,
    quarantine,
    isAvailable: () => true,
  });
  await expect(connections.getConnection()).rejects.toThrow("offline");
  expect(quarantine).toHaveBeenCalledTimes(1);
});

test("rejects connection requests for unavailable nodes", async () => {
  const getConnection = jest.fn();
  const connections = createNodeConnections({
    profile: { host: "db" },
    pool: { getConnection },
    lifecycle: { begin: jest.fn(), end: jest.fn() },
    isRetryable: jest.fn(),
    quarantine: jest.fn(),
    isAvailable: () => false,
  });
  await expect(connections.getConnection()).rejects.toThrow("unavailable");
  expect(getConnection).not.toHaveBeenCalled();
});

test("maps non-retryable acquisition errors without quarantine", async () => {
  const error = Object.assign(new Error("invalid"), { code: "ER_PARSE_ERROR" });
  const quarantine = jest.fn();
  const connections = createNodeConnections({
    profile: { host: "db" },
    pool: { getConnection: jest.fn().mockRejectedValue(error) },
    lifecycle: { begin: jest.fn(), end: jest.fn() },
    isRetryable: () => false,
    quarantine,
    isAvailable: () => true,
  });
  await expect(connections.getConnection()).rejects.toThrow("invalid");
  expect(quarantine).not.toHaveBeenCalled();
});
