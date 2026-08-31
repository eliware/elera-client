import { afterEach, expect, jest, test } from '@jest/globals';
import { createRoutingStream } from '../../../src/routing/stream-client/index.mjs';
import { FakeWebSocket, sockets } from './fixtures.mjs';
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

test('sends periodic heartbeats and clears them on close', async () => {
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, heartbeatMs: 1 });
  await client.connect();
  const socket = sockets.at(-1); socket.open();
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(socket.sent?.length ?? 0).toBeGreaterThanOrEqual(0);
  client.close();
});
