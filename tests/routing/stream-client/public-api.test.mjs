import { expect, jest, test } from "@jest/globals";
import { createRoutingStreamApi } from "../../../src/routing/stream-client/public-api.mjs";

test("exposes stream state, handlers, telemetry, and close behavior", () => {
  const socket = { readyState: 1, send: jest.fn(), close: jest.fn() };
  const state = {
    socket,
    closed: false,
    mode: "websocket",
    expectedVersion: 3,
    activeEndpoint: "http://vip",
    reconnectDeadlineAt: 10,
    heartbeat: 20,
  };
  const reconnect = { cancel: jest.fn() };
  const stopHeartbeat = jest.fn();
  const api = createRoutingStreamApi({ state, reconnect, stopHeartbeat });
  const update = jest.fn();
  const telemetry = { sent: true };
  api.setOnUpdate(update);
  api.setTelemetry(telemetry);
  api.sendTelemetry({ type: "client.telemetry" });
  expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({ type: "client.telemetry" });
  expect(api.state()).toEqual({
    connected: true,
    mode: "websocket",
    expectedVersion: 3,
    endpoint: "http://vip",
    reconnectDeadlineAt: 10,
  });
  expect(state.updateHandler).toBe(update);
  expect(state.telemetry).toBe(telemetry);
  api.close();
  expect(state.closed).toBe(true);
  expect(reconnect.cancel).toHaveBeenCalledTimes(1);
  expect(stopHeartbeat).toHaveBeenCalledWith(20);
  expect(socket.close).toHaveBeenCalledTimes(1);
});

test("does not send telemetry when the socket is not open", () => {
  const socket = { readyState: 0, send: jest.fn() };
  const api = createRoutingStreamApi({
    state: { socket },
    reconnect: { cancel: jest.fn() },
    stopHeartbeat: jest.fn(),
  });
  api.sendTelemetry({ type: "client.telemetry" });
  expect(socket.send).not.toHaveBeenCalled();
});
