import { afterEach, expect, test, jest } from '@jest/globals';
import { createRoutingStream } from '../../src/routing/stream-client.mjs';

test('requires endpoint and REST fallback', () => {
  expect(() => createRoutingStream()).toThrow('endpoint and fetchBundle');
});

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

const sockets = [];
afterEach(() => sockets.splice(0).forEach((socket) => socket.close()));
const streamBundle = { apiVersion: 'v1', application: 'app', database: 'app', physicalDatabase: 'physical_app', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'writer', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'writer', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [] }, expiresAt: '2099-01-01T00:00:00Z' };
class FakeWebSocket { constructor(url, options) { this.url = url; this.options = options; this.readyState = 0; sockets.push(this); } open() { this.readyState = 1; this.onopen?.(); } message(value) { let event = value; if (value.type === 'routing.update') event = { ...streamBundle, ...value }; if (event.type?.startsWith('routing.')) event = { generatedAt: '2099-01-01T00:00:00Z', version: 1, ...event }; if (event.type === 'routing.drain' || event.type === 'routing.recovery') event = { node: 'writer', context: {}, ...event }; if (event.type === 'routing.shutdown') event = { node: 'writer', reason: 'maintenance', reconnectDeadlineMs: 0, ...event }; this.onmessage?.({ data: JSON.stringify(event) }); } close(...args) { this.closeArgs = args; this.readyState = 3; this.onclose?.(); } }
test('authenticates, applies updates, and resynchronizes gaps', async () => {
  const update = jest.fn(); const fetchBundle = jest.fn(async () => ({ bundleVersion: 'rest' }));
  const client = createRoutingStream({ endpoint: 'http://vip', token: 'root', WebSocketImpl: FakeWebSocket, fetchBundle, onUpdate: update, reconnectMs: 100000 }); const pending = client.connect(); const socket = sockets[0];
  expect(socket.url).toBe('ws://vip/api/v1/routing/stream'); expect(socket.options).toEqual({ headers: { authorization: 'Bearer root' } }); socket.open(); expect(client.state().mode).toBe('websocket'); socket.message({ type: 'routing.update', version: 1 }); socket.message({ type: 'routing.update' }); socket.message({ type: 'routing.update', version: 3 }); await pending; await new Promise((resolve) => setImmediate(resolve));
  expect(update).toHaveBeenCalled(); expect(fetchBundle).toHaveBeenCalledWith('http://vip'); expect(client.state().expectedVersion).toBe(3); expect(client.state().mode).toBe('rest'); client.close();
});
test('falls back to REST when WebSocket is unavailable or fails', async () => { const fetchBundle = jest.fn(async () => { throw new Error('offline'); }); const warn = jest.fn(); const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle, WebSocketImpl: null, reconnectMs: 1, maxReconnectMs: 1, log: { warn } }); await client.connect(); await new Promise((resolve) => setTimeout(resolve, 5)); client.close(); expect(fetchBundle).toHaveBeenCalled(); expect(warn).toHaveBeenCalled(); });
test('reports malformed events and socket errors', async () => { const errors = []; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, onError: (error) => errors.push(error), reconnectMs: 100000 }); await client.connect(); const socket = sockets.at(-1); socket.open(); socket.onmessage?.({ data: '{' }); socket.onerror?.(new Error('socket')); client.close(); expect(errors).toHaveLength(2); });
test('rejects unsupported and malformed canonical routing events without delivering them', async () => {
  const errors = []; const updates = []; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, onUpdate: (event) => updates.push(event), onError: (error) => errors.push(error) });
  await client.connect(); const socket = sockets.at(-1); socket.open();
  socket.onmessage?.({ data: JSON.stringify({ type: 'routing.unknown', version: 1, generatedAt: '2099-01-01T00:00:00Z' }) });
  socket.onmessage?.({ data: JSON.stringify({ type: 'routing.topology', version: 2, generatedAt: '2099-01-01T00:00:00Z', node: 'writer', context: {}, topology: {} }) });
  await new Promise((resolve) => setImmediate(resolve));
  expect(updates).toHaveLength(0); expect(errors).toHaveLength(2); client.close();
});
test('replaces the update handler and closes an unopened stream', () => { const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({ }), WebSocketImpl: FakeWebSocket }); const handler = jest.fn(); client.setOnUpdate(handler); client.close(); expect(client.state().connected).toBe(false); });
test('accepts a telemetry sink after construction', () => { const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({ }), WebSocketImpl: FakeWebSocket }); client.setTelemetry({ recordReconnect: jest.fn() }); client.close(); });
test('sends telemetry only over an open socket', async () => { const sent = []; class TelemetrySocket extends FakeWebSocket { send(value) { sent.push(value); } } const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: TelemetrySocket }); await client.connect(); const socket = sockets.at(-1); client.sendTelemetry({ type: 'client.telemetry' }); expect(sent).toHaveLength(0); socket.open(); client.sendTelemetry({ type: 'client.telemetry' }); expect(sent).toHaveLength(1); client.close(); });
test('recovers from a WebSocket constructor failure', async () => { const errors = []; class BrokenWebSocket { constructor() { throw new Error('constructor'); } } const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: BrokenWebSocket, onError: (error) => errors.push(error), reconnectMs: 100000 }); await client.connect(); client.close(); expect(errors[0].message).toBe('constructor'); });
test('does not apply a REST result after the stream is closed', async () => { let resolve; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: () => new Promise((done) => { resolve = done; }), WebSocketImpl: null }); const pending = client.connect(); client.close(); resolve({ bundleVersion: 'late' }); await pending; expect(client.state().mode).toBe('disconnected'); });
test('does not schedule reconnect work after an already closed connect', async () => { const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: null }); client.close(); await client.connect(); expect(client.state().mode).toBe('disconnected'); });
test('falls back after an active socket closes and cancels its timer on shutdown', async () => { const fetchBundle = jest.fn(async () => ({ bundleVersion: 'fallback' })); const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle, WebSocketImpl: FakeWebSocket, reconnectMs: 100000 }); await client.connect(); const socket = sockets.at(-1); socket.open(); socket.close(); await new Promise((resolve) => setImmediate(resolve)); expect(client.state().mode).toBe('rest'); client.close(); });
test('ignores a failed REST fallback after shutdown', async () => { let reject; const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: () => new Promise((_, fail) => { reject = fail; }), WebSocketImpl: null }); const pending = client.connect(); client.close(); reject(new Error('late failure')); await pending; expect(client.state().mode).toBe('disconnected'); });

test('sends periodic heartbeats and clears them on close', async () => {
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, heartbeatMs: 1 });
  await client.connect();
  const socket = sockets.at(-1); socket.open();
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(socket.sent?.length ?? 0).toBeGreaterThanOrEqual(0);
  client.close();
});

test('uses top-level event versions as the authoritative ordering field', async () => {
  const update = jest.fn();
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, onUpdate: update });
  await client.connect(); const socket = sockets.at(-1); socket.open(); socket.message({ type: 'routing.update', version: 2, bundleVersion: 100 }); socket.message({ type: 'routing.update', version: 1, bundleVersion: 200 });
  expect(update).toHaveBeenCalledTimes(1); client.close();
});
test('orders integer event versions numerically', async () => {
  const update = jest.fn();
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, onUpdate: update });
  await client.connect(); const socket = sockets.at(-1); socket.open(); socket.message({ type: 'routing.update', version: 10 }); socket.message({ type: 'routing.update', version: 9 });
  expect(update).toHaveBeenCalledTimes(1); expect(client.state().expectedVersion).toBe(10); client.close();
});

test('delivers REST resyncs to the replaced update handler', async () => {
  const received = [];
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({ bundleVersion: 'rest' }), WebSocketImpl: null });
  client.setOnUpdate((event) => received.push(event));
  await client.connect();
  expect(received[0]).toMatchObject({ type: 'routing.resync', bundle: { bundleVersion: 'rest' } });
  client.close();
});

test('refreshes credentials through REST for credential-free topology events', async () => {
  const updates = []; const fetchBundle = jest.fn(async () => ({ bundleVersion: 'topology-refresh' }));
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle, WebSocketImpl: FakeWebSocket, onUpdate: (event) => updates.push(event) });
  await client.connect(); const socket = sockets.at(-1); socket.open();
  socket.message({ type: 'routing.topology', version: 1, node: 'writer', context: { nodeIdentity: { name: 'writer' }, ports: { sql: 3306, http: 8080 }, clusterCondition: 'Primary' }, topology: { nodes: [{ nodeId: 'writer', address: 'db', sqlPort: 3306, state: 'ready', draining: false }] } });
  await new Promise((resolve) => setImmediate(resolve));
  expect(fetchBundle).toHaveBeenCalledWith('http://vip');
  expect(updates).toEqual([expect.objectContaining({ type: 'routing.resync', bundle: { bundleVersion: 'topology-refresh' } })]);
  client.close();
});

test('honors a supervisor shutdown event with immediate resync and reconnect', async () => {
  const updates = [];
  const fetchBundle = jest.fn(async () => ({ bundleVersion: 'rest-after-shutdown' }));
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle, WebSocketImpl: FakeWebSocket, reconnectMs: 1, maxReconnectMs: 1, onUpdate: (event) => updates.push(event) });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({ type: 'routing.shutdown', node: 'writer', reason: 'SIGTERM', reconnect: true, reconnectDeadlineMs: 60000, loadBalancerEndpoint: 'http://new-vip' });
  await new Promise((resolve) => setImmediate(resolve));
  expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'routing.shutdown' }), expect.objectContaining({ type: 'routing.resync', bundle: { bundleVersion: 'rest-after-shutdown' } })]));
  expect(fetchBundle).toHaveBeenCalledWith('http://new-vip');
  expect(socket.closeArgs).toEqual([1012, 'supervisor restarting']);
  expect(client.state().endpoint).toBe('http://new-vip');
  expect(client.state().mode).toBe('disconnected');
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(sockets.at(-1).url).toContain('ws://new-vip/api/v1/routing/stream');
  client.close();
});

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

test('does not reconnect after the shutdown deadline expires', async () => {
  let now = 1000;
  const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket, reconnectMs: 1, maxReconnectMs: 1, now: () => now });
  await client.connect();
  const socket = sockets.at(-1);
  socket.open();
  socket.message({ type: 'routing.shutdown', reconnectDeadlineMs: 0 });
  now = 1001;
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(sockets).toHaveLength(1);
  client.close();
});
