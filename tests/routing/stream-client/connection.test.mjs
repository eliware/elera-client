import { expect, test, jest } from "@jest/globals";
import { connectRoutingSocket } from "../../../src/routing/stream-client/connection.mjs";
import { FakeWebSocket, sockets } from "../../../test-fixtures/routing/stream-client.mjs";

test("opens a socket and runs the connection callbacks", async () => {
  const state = { closed: false, mode: "disconnected" };
  const reconnect = { reset: jest.fn() };
  const fallback = jest.fn();
  const schedule = jest.fn();
  await connectRoutingSocket({
    state,
    WebSocketImpl: FakeWebSocket,
    streamUrl: () => "ws://vip/api/v1/routing/stream",
    token: "secret",
    heartbeatMs: 100000,
    now: () => 1,
    reconnect,
    fallback,
    schedule,
    onMessage: jest.fn(),
    onError: jest.fn(),
  });
  const socket = sockets.at(-1);
  expect(socket.options).toEqual({ headers: { authorization: "Bearer secret" } });
  socket.open();
  expect(state.mode).toBe("websocket");
  expect(reconnect.reset).toHaveBeenCalled();
  state.closed = true;
  socket.close();
  expect(state.socket).toBeUndefined();
});

test("uses REST when WebSocket support is missing", async () => {
  const fallback = jest.fn();
  const schedule = jest.fn();
  await connectRoutingSocket({
    state: { closed: false },
    WebSocketImpl: null,
    streamUrl: () => "ws://vip",
    now: Date.now,
    fallback,
    schedule,
  });
  expect(fallback).toHaveBeenCalled();
  expect(schedule).toHaveBeenCalled();
});
