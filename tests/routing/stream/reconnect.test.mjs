import { afterEach, expect, jest, test } from "@jest/globals";
import { createReconnectPolicy } from "../../../src/routing/stream/reconnect.mjs";
import { createRoutingStream } from "../../../src/routing/stream/index.mjs";
import { FakeWebSocket, sockets } from "../../../test-fixtures/routing/stream.mjs";

afterEach(() => {
  jest.useRealTimers();
  sockets.splice(0).forEach((socket) => socket.close());
});

test("schedules, resets, and cancels reconnect attempts", () => {
  jest.useFakeTimers();
  let connected = 0;
  const policy = createReconnectPolicy({
    reconnectMs: 10,
    maxReconnectMs: 20,
    isClosed: () => false,
    getDeadline: () => undefined,
    scheduleConnect: () => {
      connected += 1;
    },
  });
  policy.schedule();
  jest.advanceTimersByTime(10);
  expect(connected).toBe(1);
  policy.reset();
  policy.schedule();
  policy.cancel();
  jest.advanceTimersByTime(20);
  expect(connected).toBe(1);
});

test("uses the default clock when evaluating a reconnect deadline", () => {
  jest.useFakeTimers();
  const policy = createReconnectPolicy({
    reconnectMs: 1,
    getDeadline: () => Date.now() + 100,
    isClosed: () => false,
    scheduleConnect: () => {},
  });
  policy.schedule();
  policy.cancel();
});
test("uses the default reconnect delay", () => {
  jest.useFakeTimers();
  const connect = jest.fn();
  const policy = createReconnectPolicy({
    isClosed: () => false,
    getDeadline: () => undefined,
    scheduleConnect: connect,
  });
  policy.schedule();
  jest.advanceTimersByTime(1000);
  expect(connect).toHaveBeenCalled();
  policy.cancel();
});

test("honors a supervisor shutdown event with immediate resync and reconnect", async () => {
  const updates = [];
  const fetchBundle = jest.fn(async () => ({ bundleVersion: 4 }));
  const client = createRoutingStream({
    endpoint: "http://vip",
    fetchBundle,
    WebSocketImpl: FakeWebSocket,
    reconnectMs: 1,
    maxReconnectMs: 1,
    onUpdate: (event) => updates.push(event),
  });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({
    type: "routing.shutdown",
    node: "writer",
    reason: "SIGTERM",
    reconnectDeadlineMs: 60000,
    loadBalancerEndpoint: "http://new-vip",
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(updates).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "routing.shutdown" }),
      expect.objectContaining({ type: "routing.resync", bundle: { bundleVersion: 4 } }),
    ]),
  );
  expect(fetchBundle).toHaveBeenCalledWith("http://new-vip");
  expect(socket.closeArgs).toEqual([1012, "supervisor restarting"]);
  expect(client.state().endpoint).toBe("http://new-vip");
  client.close();
});
