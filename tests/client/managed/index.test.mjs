import "../../../test-fixtures/silence-default-logger.mjs";
import { afterEach, expect, jest, test } from "@jest/globals";
import { createDb } from "../../../src/client/managed/index.mjs";
import {
  bundle,
  driver,
  FakeWebSocket,
  LifecycleSocket,
  makeManagedClient,
  sockets,
} from "../../../test-fixtures/client/managed.mjs";

afterEach(() => {
  while (sockets.length) sockets.pop().close();
});

const fetchBundle = (fetchImpl, value = bundle) =>
  fetchImpl.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, operation: "routing.bundle", data: value }),
  });

const createManagedDb = async ({ WebSocketImpl = FakeWebSocket, ...options } = {}) => {
  const fetchImpl = jest.fn();
  fetchBundle(fetchImpl);
  const endpointOptions =
    options.env === undefined ? { endpoint: "http://vip:8080", token: "token" } : {};
  const client = await createDb({
    ...endpointOptions,
    fetchImpl,
    WebSocketImpl,
    mysqlLib: driver,
    ...options,
  });
  return { client, fetchImpl };
};

test("creates managed clients from environment values and rejects missing config", async () => {
  const { client: envClient, fetchImpl: envFetch } = await createManagedDb({
    env: { ELERA_API_URL: "http://env:8080", ELERA_API_TOKEN: "env-token" },
  });
  expect(envFetch.mock.calls[0][0]).toBe("http://env:8080/api/v1/routing/bundle");
  await envClient.end();
  await expect(createDb()).rejects.toThrow();
  await expect(createDb({ env: {} })).rejects.toThrow();
});

test("starts and stops an injected telemetry sink", async () => {
  const telemetry = { start: jest.fn(), stop: jest.fn() };
  const { client } = await createManagedDb({ telemetry });
  expect(telemetry.start).toHaveBeenCalledTimes(1);
  await client.end();
  expect(telemetry.stop).toHaveBeenCalledTimes(1);
});

test("injects a logger through the managed API without logging sensitive values", async () => {
  const log = Object.fromEntries(
    ["error", "warn", "info", "http", "verbose", "debug", "silly"].map((level) => [
      level,
      jest.fn(),
    ]),
  );
  const failure = Object.assign(new Error("private-value"), { code: "ER_QUERY_FAILED" });
  const mysqlLib = {
    createPool: () => ({
      query: jest.fn().mockRejectedValue(failure),
      execute: jest.fn(),
      getConnection: jest.fn(),
      end: jest.fn(async () => {}),
    }),
  };
  const { client } = await createManagedDb({ log, mysqlLib });
  await expect(
    client.query("UPDATE users SET secret = ?", ["private-value"]),
  ).rejects.toMatchObject({ code: "ER_QUERY_FAILED" });
  expect(log.info).toHaveBeenCalledWith("Managed database client ready", {
    operation: "client.create",
    balancedPool: true,
    routing: "auto",
  });
  expect(log.error).toHaveBeenCalledWith("SQL operation failed", {
    operation: "sql.query",
    outcome: "failure",
    route: "primary",
    errorCode: "ER_QUERY_FAILED",
  });
  const records = Object.values(log).flatMap((writer) => writer.mock.calls);
  expect(JSON.stringify(records)).not.toContain("private-value");
  expect(JSON.stringify(records)).not.toContain("UPDATE users");
  await client.end();
});

test("attaches and closes its routing stream", async () => {
  const { client } = await createManagedDb({
    WebSocketImpl: LifecycleSocket,
  });
  expect(sockets[0].url).toBe("ws://vip:8080/api/v1/routing/stream");
  await client.end();
  expect(sockets[0].readyState).toBe(3);
});

test("preserves writer connection methods and release behavior", async () => {
  const release = jest.fn();
  const connection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    query: jest.fn(),
    execute: jest.fn(),
    release,
  };
  const { client } = await makeManagedClient({ connection });
  const acquired = await client.getConnection();
  await acquired.beginTransaction();
  await acquired.execute("UPDATE t SET x=?", [1]);
  await acquired.commit();
  acquired.release();
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.commit).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
  await client.end();
});

test("keeps rollback and release available after a failed connection query", async () => {
  const release = jest.fn();
  const connection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    query: jest.fn(),
    execute: jest.fn(async () => {
      throw new Error("constraint");
    }),
    release,
  };
  const { client } = await makeManagedClient({ connection });
  const acquired = await client.getConnection();
  await acquired.beginTransaction();
  await expect(acquired.execute("INSERT INTO t VALUES (?)", [1])).rejects.toThrow("constraint");
  await acquired.rollback();
  acquired.release();
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
  await client.end();
});
