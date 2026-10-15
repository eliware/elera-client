import { expect, jest, test } from "@jest/globals";
import { createNodeConnections } from "../../../src/pools/node-pool/connections.mjs";

test("counts active work until an acquired connection releases once", async () => {
  const release = jest.fn();
  const connection = { release };
  const lifecycle = { begin: jest.fn(), end: jest.fn() };
  const connections = createNodeConnections({
    profile: { host: "db" },
    pool: { getConnection: jest.fn(async () => connection) },
    lifecycle,
    isRetryable: jest.fn(),
    quarantine: jest.fn(),
    isAvailable: () => true,
  });
  const acquired = await connections.getConnection();
  acquired.release();
  acquired.release();
  expect(lifecycle.begin).toHaveBeenCalledTimes(1);
  expect(lifecycle.end).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});

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
