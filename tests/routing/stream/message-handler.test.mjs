import { afterEach, beforeEach, expect, test, jest } from "@jest/globals";
import { createRoutingMessageHandler } from "../../../src/routing/stream/message-handler.mjs";
import { createRoutingStream } from "../../../src/routing/stream/index.mjs";
import { FakeWebSocket, sockets, streamBundle } from "../../../test-fixtures/routing/stream.mjs";

beforeEach(() => jest.useFakeTimers({ doNotFake: ["setImmediate"] }));
afterEach(() => {
  jest.useRealTimers();
  sockets.splice(0).forEach((socket) => socket.close());
});

test("routes an update and ignores an older version", async () => {
  const state = { expectedVersion: 2, updateHandler: jest.fn() };
  const fallback = jest.fn();
  const onError = jest.fn();
  const handler = createRoutingMessageHandler({
    state,
    fallback,
    reconnect: { cancel: jest.fn(), reset: jest.fn() },
    now: () => 10,
    onError,
  });
  await handler({
    data: JSON.stringify({
      ...streamBundle,
      type: "routing.update",
      version: 1,
      generatedAt: "2099-01-01T00:00:00Z",
    }),
  });
  expect(state.updateHandler).not.toHaveBeenCalled();
  expect(fallback).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});

test("dispatches parsed shutdown events to the update handler", async () => {
  const state = { updateHandler: jest.fn() };
  const fallback = jest.fn();
  const reconnect = { cancel: jest.fn(), reset: jest.fn() };
  const handler = createRoutingMessageHandler({ state, fallback, reconnect, now: () => 10 });
  await handler({
    data: JSON.stringify({
      type: "routing.shutdown",
      node: "writer",
      reason: "maintenance",
      reconnectDeadlineMs: 50,
      loadBalancerEndpoint: "http://next-vip",
      generatedAt: "2099-01-01T00:00:00Z",
      version: 1,
    }),
  });
  expect(state.updateHandler).toHaveBeenCalledWith(
    expect.objectContaining({ type: "routing.shutdown", loadBalancerEndpoint: "http://next-vip" }),
  );
  expect(fallback).toHaveBeenCalled();
  expect(reconnect.reset).toHaveBeenCalled();
});

test("awaits gap recovery and topology resynchronization", async () => {
  const updateHandler = jest.fn();
  const fallback = jest.fn(async () => {});
  const state = { expectedVersion: 1, updateHandler };
  const onError = jest.fn();
  const handler = createRoutingMessageHandler({
    state,
    fallback,
    reconnect: { cancel: jest.fn(), reset: jest.fn() },
    now: () => 10,
    onError,
  });
  await handler({
    data: JSON.stringify({
      ...streamBundle,
      type: "routing.update",
      version: 3,
      generatedAt: "2099-01-01T00:00:00Z",
    }),
  });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(updateHandler).toHaveBeenCalledTimes(1);
  await handler({
    data: JSON.stringify({
      type: "routing.topology",
      version: 4,
      generatedAt: "2099-01-01T00:00:00Z",
      node: "writer",
      context: {
        nodeIdentity: { name: "writer" },
        ports: { sql: 3306, http: 8080 },
        clusterCondition: "Primary",
      },
      topology: { nodes: [] },
    }),
  });
  expect(fallback).toHaveBeenCalledTimes(2);
  expect(updateHandler).toHaveBeenCalledTimes(2);
  expect(updateHandler).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "routing.topology" }),
  );
  expect(onError).not.toHaveBeenCalled();
});

test("reports malformed events and socket errors", async () => {
  const errors = [];
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
    onError: (error) => errors.push(error),
    reconnectMs: 100000,
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.onmessage?.({ data: "{" });
  socket.onerror?.(new Error("socket"));
  client.close();
  expect(errors).toHaveLength(2);
});

test("rejects unsupported and malformed canonical events without delivery", async () => {
  const errors = [];
  const updates = [];
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
    onUpdate: (event) => updates.push(event),
    onError: (error) => errors.push(error),
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.onmessage?.({
    data: JSON.stringify({
      type: "routing.unknown",
      version: 1,
      generatedAt: "2099-01-01T00:00:00Z",
    }),
  });
  socket.onmessage?.({
    data: JSON.stringify({
      type: "routing.topology",
      version: 2,
      generatedAt: "2099-01-01T00:00:00Z",
      node: "writer",
      context: {},
      topology: {},
    }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(updates).toHaveLength(0);
  expect(errors).toHaveLength(2);
  client.close();
});
