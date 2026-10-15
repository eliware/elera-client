import { expect, jest, test } from "@jest/globals";
import { bindSocketHandlers } from "../../../src/routing/stream-client/socket-handlers.mjs";

test("binds message, error, and close handlers", () => {
  const socket = {};
  const onMessage = jest.fn();
  const onError = jest.fn();
  const recovery = { close: jest.fn() };
  bindSocketHandlers({ socket, state: {}, recovery, onMessage, onError });
  expect(socket.onmessage).toBe(onMessage);
  socket.onerror("error");
  socket.onclose();
  expect(onError).toHaveBeenCalledWith("error");
  expect(recovery.close).toHaveBeenCalledTimes(1);
});

test("updates connection state and starts heartbeat after socket open", () => {
  jest.useFakeTimers();
  const socket = {};
  const state = {
    connecting: true,
    mode: "connecting",
    disconnectedAt: 2,
    lastReconnectWasPlanned: true,
  };
  const reconnect = { reset: jest.fn() };
  const telemetry = { recordReconnect: jest.fn() };
  bindSocketHandlers({
    socket,
    state,
    heartbeatMs: 1000,
    now: () => 10,
    telemetry,
    reconnect,
    recovery: { close: jest.fn() },
  });
  socket.onopen();
  expect(state).toMatchObject({
    connecting: false,
    mode: "websocket",
    lastReconnectWasPlanned: false,
  });
  expect(state.reconnectDeadlineAt).toBeUndefined();
  expect(state.disconnectedAt).toBeUndefined();
  expect(reconnect.reset).toHaveBeenCalledTimes(1);
  expect(telemetry.recordReconnect).toHaveBeenCalledWith({ delayMs: 8, failover: true });
  clearInterval(state.heartbeat);
  jest.useRealTimers();
});
