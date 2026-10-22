import { afterEach, expect, jest, test } from "@jest/globals";
import { createReconnectPolicy } from "../../../src/routing/stream/reconnect.mjs";

afterEach(() => {
  jest.useRealTimers();
});

test("schedules, resets, and cancels reconnect attempts", async () => {
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
  await jest.advanceTimersByTimeAsync(10);
  expect(connected).toBe(1);
  policy.reset();
  policy.schedule();
  policy.cancel();
  await jest.advanceTimersByTimeAsync(20);
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
test("uses the default reconnect delay", async () => {
  jest.useFakeTimers();
  const connect = jest.fn();
  const policy = createReconnectPolicy({
    isClosed: () => false,
    getDeadline: () => undefined,
    scheduleConnect: connect,
  });
  policy.schedule();
  await jest.advanceTimersByTimeAsync(1000);
  expect(connect).toHaveBeenCalled();
  policy.cancel();
});

test("reschedules when a reconnect attempt rejects", async () => {
  jest.useFakeTimers();
  const connect = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue();
  const policy = createReconnectPolicy({
    reconnectMs: 10,
    maxReconnectMs: 20,
    isClosed: () => false,
    getDeadline: () => undefined,
    scheduleConnect: connect,
  });
  policy.schedule();
  await jest.advanceTimersByTimeAsync(10);
  expect(connect).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(20);
  expect(connect).toHaveBeenCalledTimes(2);
  policy.cancel();
});
