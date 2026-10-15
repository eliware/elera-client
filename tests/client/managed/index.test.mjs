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

test("creates managed clients from environment values and rejects missing config", async () => {
  const envFetch = jest.fn();
  fetchBundle(envFetch);
  const envClient = await createDb({
    env: { ELERA_API_URL: "http://env:8080", ELERA_API_TOKEN: "env-token" },
    fetchImpl: envFetch,
    WebSocketImpl: FakeWebSocket,
    mysqlLib: driver,
  });
  expect(envFetch.mock.calls[0][0]).toBe("http://env:8080/api/v1/routing/bundle");
  await envClient.end();
  await expect(createDb()).rejects.toThrow();
  await expect(createDb({ env: {} })).rejects.toThrow();
});

test("starts and stops an injected telemetry sink", async () => {
  const fetchImpl = jest.fn();
  fetchBundle(fetchImpl);
  const telemetry = { start: jest.fn(), stop: jest.fn() };
  const client = await createDb({
    endpoint: "http://vip:8080",
    token: "token",
    telemetry,
    fetchImpl,
    WebSocketImpl: FakeWebSocket,
    mysqlLib: driver,
  });
  expect(telemetry.start).toHaveBeenCalledTimes(1);
  await client.end();
  expect(telemetry.stop).toHaveBeenCalledTimes(1);
});

test("attaches and closes its routing stream", async () => {
  const fetchImpl = jest.fn();
  fetchBundle(fetchImpl);
  const client = await createDb({
    endpoint: "http://vip:8080",
    token: "token",
    fetchImpl,
    WebSocketImpl: LifecycleSocket,
    mysqlLib: driver,
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
