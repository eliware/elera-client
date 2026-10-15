import { afterEach, expect, jest, test } from "@jest/globals";
import { createDb } from "../../../src/client/managed/index.mjs";
import {
  bundle,
  driver,
  FakeWebSocket,
  LifecycleSocket,
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

test("creates a managed client from endpoint and token", async () => {
  const fetchImpl = jest.fn();
  fetchBundle(fetchImpl);
  const client = await createDb({
    endpoint: "http://vip:8080",
    token: "token",
    fetchImpl,
    WebSocketImpl: FakeWebSocket,
    mysqlLib: driver,
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    "http://vip:8080/api/v1/routing/bundle",
    expect.objectContaining({
      headers: expect.objectContaining({ authorization: "Bearer token" }),
    }),
  );
  expect(Object.keys(client).sort()).toEqual(["end", "execute", "getConnection", "probe", "query"]);
  await client.end();
});

test("uses a supplied environment and rejects missing managed credentials", async () => {
  await expect(createDb()).rejects.toThrow();
  const fetchImpl = jest.fn();
  fetchBundle(fetchImpl);
  const client = await createDb({
    env: { ELERA_API_URL: "http://env:8080", ELERA_API_TOKEN: "env-token" },
    fetchImpl,
    WebSocketImpl: FakeWebSocket,
    mysqlLib: driver,
  });
  expect(fetchImpl.mock.calls[0][0]).toBe("http://env:8080/api/v1/routing/bundle");
  await client.end();
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
  await client.end();
  expect(telemetry.stop).toHaveBeenCalledTimes(1);
});

test("applies routing updates and closes its stream", async () => {
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
  sockets[0].message({
    ...bundle,
    type: "routing.update",
    version: 2,
    generatedAt: "2099-01-01T00:00:00Z",
    bundleVersion: 2,
    writer: { host: "writer-b", port: 3306 },
    routes: { primary: [{ host: "writer-b", port: 3306 }], balanced: bundle.routes.balanced },
  });
  await new Promise((resolve) => setImmediate(resolve));
  await client.end();
  expect(sockets[0].readyState).toBe(3);
});
