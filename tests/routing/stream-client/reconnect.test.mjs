import { afterEach, expect, jest, test } from '@jest/globals';
import { createReconnectPolicy } from '../../../src/routing/stream-client/reconnect.mjs';
import { createRoutingStream } from '../../../src/routing/stream-client/index.mjs';
import { FakeWebSocket, sockets } from './fixtures.mjs';

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

test('recovers from a WebSocket constructor failure', async () => { const errors = []; class BrokenWebSocket { constructor() { throw new Error('constructor'); } } const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: BrokenWebSocket, onError: (error) => errors.push(error), reconnectMs: 100000 }); await client.connect(); client.close(); expect(errors[0].message).toBe('constructor'); });
test('does not schedule reconnect work after an already closed connect', async () => { const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: null }); client.close(); await client.connect(); expect(client.state().mode).toBe('disconnected'); });
test('honors a supervisor shutdown event with immediate resync and reconnect', async () => { const updates = []; const fetchBundle = jest.fn(async () => ({ bundleVersion: 'rest-after-shutdown' })); const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle, WebSocketImpl: FakeWebSocket, reconnectMs: 1, maxReconnectMs: 1, onUpdate: (event) => updates.push(event) }); await client.connect(); const socket = sockets.at(-1); socket.open(); socket.message({ type: 'routing.shutdown', node: 'writer', reason: 'SIGTERM', reconnect: true, reconnectDeadlineMs: 60000, loadBalancerEndpoint: 'http://new-vip' }); await new Promise((resolve) => setImmediate(resolve)); expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'routing.shutdown' }), expect.objectContaining({ type: 'routing.resync', bundle: { bundleVersion: 'rest-after-shutdown' } })])); expect(fetchBundle).toHaveBeenCalledWith('http://new-vip'); expect(socket.closeArgs).toEqual([1012, 'supervisor restarting']); expect(client.state().endpoint).toBe('http://new-vip'); client.close(); });
test('does not reconnect after the shutdown deadline expires', async () => { let now = 1000; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, reconnectMs: 1, maxReconnectMs: 1, now: () => now }); await client.connect(); const socket = sockets.at(-1); socket.open(); socket.message({ type: 'routing.shutdown', reconnectDeadlineMs: 0 }); now = 1001; await new Promise((resolve) => setImmediate(resolve)); await new Promise((resolve) => setTimeout(resolve, 5)); expect(sockets).toHaveLength(1); client.close(); });
