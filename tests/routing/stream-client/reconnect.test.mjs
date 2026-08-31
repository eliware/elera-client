import { afterEach, expect, jest, test } from '@jest/globals';
import { createReconnectPolicy } from '../../../src/routing/stream-client/reconnect.mjs';

afterEach(() => jest.useRealTimers());

test('schedules, resets, and cancels reconnect attempts', () => {
  jest.useFakeTimers();
  let connected = 0;
  const policy = createReconnectPolicy({ reconnectMs: 10, maxReconnectMs: 20, isClosed: () => false, getDeadline: () => undefined, scheduleConnect: () => { connected += 1; } });
  policy.schedule();
  jest.advanceTimersByTime(10);
  expect(connected).toBe(1);
  policy.reset();
  policy.schedule();
  policy.cancel();
  jest.advanceTimersByTime(20);
  expect(connected).toBe(1);
});

test('uses the default clock when evaluating a reconnect deadline', () => {
  jest.useFakeTimers();
  const policy = createReconnectPolicy({ reconnectMs: 1, getDeadline: () => Date.now() + 100, isClosed: () => false, scheduleConnect: () => {} });
  policy.schedule();
  policy.cancel();
});
