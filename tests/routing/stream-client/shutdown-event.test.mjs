import { expect, jest, test } from "@jest/globals";
import { handleShutdownEvent } from "../../../src/routing/stream-client/shutdown-event.mjs";
import { createRoutingStream } from "../../../src/routing/stream-client/index.mjs";
import { FakeWebSocket, sockets } from "../../../test-fixtures/routing/stream-client.mjs";

afterEach(() => sockets.splice(0).forEach((socket) => socket.close()));

test("updates the endpoint and reconnect state before fallback and socket close", async () => {
  const events = [];
  const state = {
    activeEndpoint: "http://vip",
    updateHandler: jest.fn(() => events.push("update")),
    socket: { close: jest.fn(() => events.push("close")) },
  };
  const fallback = jest.fn(async () => events.push("fallback"));
  const reconnect = {
    cancel: jest.fn(),
    reset: jest.fn(() => events.push("reset")),
  };
  await expect(
    handleShutdownEvent(
      { type: "routing.shutdown", reconnectDeadlineMs: 50, loadBalancerEndpoint: "http://next" },
      { state, fallback, reconnect, now: () => 10 },
    ),
  ).resolves.toBe(true);
  expect(state.activeEndpoint).toBe("http://next");
  expect(state.reconnectDeadlineAt).toBe(60);
  expect(state.plannedReconnect).toBe(true);
  expect(reconnect.cancel).not.toHaveBeenCalled();
  expect(events).toEqual(["update", "reset", "fallback", "close"]);
});

test("cancels immediate reconnect and accepts an event without optional handlers", async () => {
  const reconnect = { cancel: jest.fn(), reset: jest.fn() };
  const fallback = jest.fn();
  const context = { state: { activeEndpoint: "http://vip" }, fallback, reconnect, now: () => 1 };
  await expect(
    handleShutdownEvent({ type: "routing.shutdown", reconnectDeadlineMs: 0 }, context),
  ).resolves.toBe(true);
  expect(handleShutdownEvent({ type: "routing.update" }, context)).toBe(false);
  expect(reconnect.cancel).toHaveBeenCalledTimes(1);
  expect(fallback).toHaveBeenCalledTimes(1);
});

test("does not reconnect after its shutdown deadline expires", async () => {
  let now = 1000;
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
    reconnectMs: 1,
    maxReconnectMs: 1,
    now: () => now,
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({
    type: "routing.shutdown",
    node: "writer",
    reason: "maintenance",
    reconnectDeadlineMs: 0,
    generatedAt: "2099-01-01T00:00:00Z",
    version: 1,
  });
  now = 1001;
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(sockets).toHaveLength(1);
  client.close();
});

test("records telemetry for an intentional reconnect", async () => {
  const recordReconnect = jest.fn();
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
    telemetry: { recordReconnect },
    reconnectMs: 1,
    maxReconnectMs: 1,
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({
    type: "routing.shutdown",
    node: "elera-0",
    reason: "maintenance",
    reconnectDeadlineMs: 60000,
    generatedAt: "2099-01-01T00:00:00Z",
    version: 1,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 5));
  sockets.at(-1).open();
  expect(recordReconnect).toHaveBeenCalledWith({ delayMs: expect.any(Number), failover: true });
  client.close();
});
