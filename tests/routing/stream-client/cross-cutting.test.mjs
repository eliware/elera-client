import { afterEach, expect, test, jest } from '@jest/globals';
import { createRoutingStream } from '../../../src/routing/stream-client/index.mjs';
import { sockets, streamBundle, FakeWebSocket } from './fixtures.mjs';


test('waits for an asynchronous REST update handler before connect resolves', async () => {
  let release; let handled = false;
  const client = createRoutingStream({ endpoint: 'http://vip', WebSocketImpl: null, fetchBundle: async () => ({ bundleVersion: 1 }), onUpdate: async () => { await new Promise((resolve) => { release = resolve; }); handled = true; } });
  const pending = client.connect();
  await new Promise((resolve) => setImmediate(resolve));
  expect(handled).toBe(false);
  release();
  await pending;
  expect(handled).toBe(true);
  client.close();
});

afterEach(() => sockets.splice(0).forEach((socket) => socket.close()));
test('authenticates, applies updates, and resynchronizes gaps', async () => {
  const update = jest.fn(); const fetchBundle = jest.fn(async () => ({ bundleVersion: 6 }));
  const client = createRoutingStream({ endpoint: 'http://vip', token: 'root', WebSocketImpl: FakeWebSocket, fetchBundle, onUpdate: update, reconnectMs: 100000 }); const pending = client.connect(); const socket = sockets[0];
  expect(socket.url).toBe('ws://vip/api/v1/routing/stream'); expect(socket.options).toEqual({ headers: { authorization: 'Bearer root' } }); socket.open(); expect(client.state().mode).toBe('websocket'); socket.message({ type: 'routing.update', version: 1 }); socket.message({ type: 'routing.update' }); socket.message({ type: 'routing.update', version: 3 }); await pending; await new Promise((resolve) => setImmediate(resolve));
  expect(update).toHaveBeenCalled(); expect(fetchBundle).toHaveBeenCalledWith('http://vip'); expect(client.state().expectedVersion).toBe(3); expect(client.state().mode).toBe('rest'); client.close();
});
test('rejects unsupported and malformed canonical routing events without delivering them', async () => {
  const errors = []; const updates = []; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, onUpdate: (event) => updates.push(event), onError: (error) => errors.push(error) });
  await client.connect(); const socket = sockets.at(-1); socket.open();
  socket.onmessage?.({ data: JSON.stringify({ type: 'routing.unknown', version: 1, generatedAt: '2099-01-01T00:00:00Z' }) });
  socket.onmessage?.({ data: JSON.stringify({ type: 'routing.topology', version: 2, generatedAt: '2099-01-01T00:00:00Z', node: 'writer', context: {}, topology: {} }) });
  await new Promise((resolve) => setImmediate(resolve));
  expect(updates).toHaveLength(0); expect(errors).toHaveLength(2); client.close();
});
test('replaces the update handler and closes an unopened stream', () => { const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({ }), WebSocketImpl: FakeWebSocket }); const handler = jest.fn(); client.setOnUpdate(handler); client.close(); expect(client.state().connected).toBe(false); });
test('ignores a failed REST fallback after shutdown', async () => { let reject; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: () => new Promise((_, fail) => { reject = fail; }), WebSocketImpl: null }); const pending = client.connect(); client.close(); reject(new Error('late failure')); await pending; expect(client.state().mode).toBe('disconnected'); });





test('records an intentional reconnect separately from ordinary socket loss', async () => {
  const recordReconnect = jest.fn();
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, telemetry: { recordReconnect }, reconnectMs: 1, maxReconnectMs: 1 });
  await client.connect();
  const socket = sockets.at(-1); socket.open(); socket.message({ type: 'routing.shutdown', node: 'elera-0' });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 5));
  sockets.at(-1).open();
  expect(recordReconnect).toHaveBeenCalledWith({ delayMs: expect.any(Number), failover: false });
  client.close();
});
