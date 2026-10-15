import { afterEach, expect, jest, test } from "@jest/globals";
import { createRoutingStreamApi } from "../../../src/routing/stream/public-api.mjs";
import { createRoutingStream } from "../../../src/routing/stream/index.mjs";
import { FakeWebSocket, sockets } from "../../../test-fixtures/routing/stream-client.mjs";

afterEach(() => sockets.splice(0).forEach((socket) => socket.close()));

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

test("accepts a telemetry sink after stream construction", () => {
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: FakeWebSocket,
  });
  client.setTelemetry({ recordReconnect: jest.fn() });
  client.close();
});

test("sends telemetry only over an open socket", async () => {
  const sent = [];
  class TelemetrySocket extends FakeWebSocket {
    send(value) {
      sent.push(value);
    }
  }
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle: async () => ({}),
    WebSocketImpl: TelemetrySocket,
  });
  await client.connect();
  const socket = sockets.at(-1);
  client.sendTelemetry({ type: "client.telemetry" });
  expect(sent).toHaveLength(0);
  socket.open();
  client.sendTelemetry({ type: "client.telemetry" });
  expect(sent).toHaveLength(1);
  client.close();
});
