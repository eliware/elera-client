import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { createRoutingStream } from "../../../src/routing/stream/index.mjs";
import {
  createRestFallback,
  createRuntimeFallback,
} from "../../../src/routing/stream/fallback.mjs";
import { FakeWebSocket, sockets } from "../../../test-fixtures/routing/stream.mjs";

beforeEach(() => jest.useFakeTimers({ doNotFake: ["setImmediate"] }));
afterEach(() => jest.useRealTimers());

test("returns REST resync data to the update handler", async () => {
  const update = jest.fn();
  const setMode = jest.fn();
  const http = jest.fn();
  const fallback = createRestFallback({
    fetchBundle: async (endpoint) => ({ endpoint, bundleVersion: 4 }),
    getEndpoint: () => "http://vip",
    isClosed: () => false,
    getVersion: () => 3,
    setMode,
    update,
    now: () => 10,
    log: { http, warn: jest.fn() },
  });
  await fallback();
  expect(setMode).toHaveBeenCalledWith("rest");
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ type: "routing.resync", version: 3, receivedAt: 10 }),
  );
  expect(http).toHaveBeenCalledWith("Routing bundle refresh completed", {
    operation: "routing.bundle.refresh",
    outcome: "success",
    transport: "http",
  });
});

test("connects fallback state and update callbacks", async () => {
  const state = {
    activeEndpoint: "http://vip",
    closed: false,
    expectedVersion: 2,
    mode: "websocket",
    updateHandler: jest.fn(),
  };
  const fallback = createRuntimeFallback({
    fetchBundle: jest.fn(async () => ({ bundleVersion: 3 })),
    state,
    now: () => 10,
    onError: jest.fn(),
    log: { warn: jest.fn() },
  });
  await fallback();
  expect(state.mode).toBe("rest");
  expect(state.updateHandler).toHaveBeenCalledWith(
    expect.objectContaining({ type: "routing.resync", version: 2 }),
  );
});

test("requires endpoint and REST fallback", () => {
  expect(() => createRoutingStream()).toThrow("endpoint and fetchBundle");
});

test("ignores a fallback error after stream close", async () => {
  const setMode = jest.fn();
  const onError = jest.fn();
  const warn = jest.fn();
  const http = jest.fn();
  const fallback = createRestFallback({
    fetchBundle: async () => {
      throw new Error("offline");
    },
    getEndpoint: () => "http://vip",
    isClosed: () => true,
    getVersion: () => 1,
    setMode,
    update: jest.fn(),
    onError,
    log: { warn, http },
    now: () => 10,
  });

  await fallback();

  expect(setMode).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  expect(http).not.toHaveBeenCalled();
});

test("logs a safe warning when an active HTTP refresh fails", async () => {
  const warn = jest.fn();
  const failure = new Error("private-value");
  const fallback = createRestFallback({
    fetchBundle: async () => Promise.reject(failure),
    getEndpoint: () => "http://private-endpoint",
    isClosed: () => false,
    getVersion: () => 1,
    setMode: jest.fn(),
    update: jest.fn(),
    onError: jest.fn(),
    log: { warn },
    now: () => 1,
  });
  await fallback();
  expect(warn).toHaveBeenCalledWith("Routing HTTP fallback failed", {
    operation: "routing.bundle.refresh",
    outcome: "failure",
    transport: "http",
  });
  expect(JSON.stringify(warn.mock.calls)).not.toContain("private-value");
  expect(JSON.stringify(warn.mock.calls)).not.toContain("private-endpoint");
});
test("falls back to REST when WebSocket is unavailable or fails", async () => {
  const fetchBundle = jest.fn(async () => {
    throw new Error("offline");
  });
  const warn = jest.fn();
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle,
    WebSocketImpl: null,
    reconnectMs: 1,
    maxReconnectMs: 1,
    log: { warn },
  });
  await client.connect();
  await jest.advanceTimersByTimeAsync(5);
  client.close();
  expect(fetchBundle).toHaveBeenCalled();
  expect(warn).toHaveBeenCalled();
});
test("does not apply a REST result after the stream is closed", async () => {
  let resolve;
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: () =>
      new Promise((done) => {
        resolve = done;
      }),
    WebSocketImpl: null,
  });
  const pending = client.connect();
  client.close();
  resolve({ bundleVersion: "late" });
  await pending;
  expect(client.state().mode).toBe("disconnected");
});
test("falls back after an active socket closes", async () => {
  const fetchBundle = jest.fn(async () => ({ bundleVersion: "fallback" }));
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle,
    WebSocketImpl: FakeWebSocket,
    reconnectMs: 100000,
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.close();
  await new Promise((resolve) => setImmediate(resolve));
  expect(client.state().mode).toBe("rest");
  client.close();
});
