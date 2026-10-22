import { afterEach, beforeEach, expect, test, jest } from "@jest/globals";
import { createRoutingRuntime } from "../../../src/routing/stream/runtime.mjs";
import { createRoutingStream } from "../../../src/routing/stream/index.mjs";
import { FakeWebSocket, sockets } from "../../../test-fixtures/routing/stream.mjs";

beforeEach(() => jest.useFakeTimers({ doNotFake: ["setImmediate"] }));
afterEach(() => {
  jest.useRealTimers();
  sockets.splice(0).forEach((socket) => socket.close());
});

test("builds a disconnected runtime with its public stream API", () => {
  const runtime = createRoutingRuntime({
    endpoint: "http://vip",
    fetchBundle: jest.fn(async () => ({})),
  });
  expect(runtime.state()).toMatchObject({ connected: false, mode: "disconnected" });
  expect(runtime.setOnUpdate).toEqual(expect.any(Function));
  runtime.close();
});

test("uses top-level event versions as the authoritative ordering field", async () => {
  const update = jest.fn();
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
    onUpdate: update,
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({ type: "routing.update", version: 2, bundleVersion: 100 });
  socket.message({ type: "routing.update", version: 1, bundleVersion: 200 });
  expect(update).toHaveBeenCalledTimes(1);
  client.close();
});

test("orders integer event versions numerically", async () => {
  const update = jest.fn();
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
    onUpdate: update,
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({ type: "routing.update", version: 10 });
  socket.message({ type: "routing.update", version: 9 });
  expect(update).toHaveBeenCalledTimes(1);
  expect(client.state().expectedVersion).toBe(10);
  client.close();
});

test("refreshes credentials through REST for credential-free topology events", async () => {
  const updates = [];
  const fetchBundle = jest.fn(async () => ({ bundleVersion: 5 }));
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle,
    WebSocketImpl: FakeWebSocket,
    onUpdate: (event) => updates.push(event),
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({
    type: "routing.topology",
    version: 1,
    node: "writer",
    context: {
      nodeIdentity: { name: "writer" },
      ports: { sql: 3306, http: 8080 },
      clusterCondition: "Primary",
    },
    topology: {
      nodes: [{ nodeId: "writer", address: "db", sqlPort: 3306, state: "ready", draining: false }],
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(fetchBundle).toHaveBeenCalledWith("http://vip");
  expect(updates).toEqual([
    expect.objectContaining({ type: "routing.topology" }),
    expect.objectContaining({ type: "routing.resync", bundle: { bundleVersion: 5 } }),
  ]);
  client.close();
});
