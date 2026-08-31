import { afterEach, expect, jest, test } from '@jest/globals';
import { startHeartbeat, stopHeartbeat } from '../../../src/routing/stream-client/heartbeat.mjs';

afterEach(() => jest.useRealTimers());

test('sends heartbeat payloads and can stop the timer', () => {
  jest.useFakeTimers();
  const socket = { send: jest.fn() };
  const timer = startHeartbeat({ getSocket: () => socket, heartbeatMs: 10, now: () => 123 });
  jest.advanceTimersByTime(10);
  expect(socket.send).toHaveBeenCalledWith('{"type":"heartbeat","sentAt":123}');
  stopHeartbeat(timer);
  jest.advanceTimersByTime(20);
  expect(socket.send).toHaveBeenCalledTimes(1);
});
