import { jest } from '@jest/globals';
import { createDb } from '../../src/client/managed.mjs';

const bundle = { apiVersion: 'v1', application: 'app', database: 'db', identity: 'runtime', credentialName: 'rw', scopes: ['read', 'write'], credentials: { username: 'u', password: 'p' }, routes: { primary: [{ host: 'writer-a', port: 3306 }], balanced: [{ host: 'reader-a', port: 3306 }] }, writer: { host: 'writer-a', port: 3306 }, readers: [{ host: 'reader-a', port: 3306 }], failover: [], bundleVersion: 1, nodeIdentity: 'writer-a', ports: { sql: 3306, http: 8080 }, expiresAt: '2099-01-01T00:00:00Z' };
const driver = { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) };
const sockets = [];

class LifecycleSocket {
  constructor(url, options) { this.url = url; this.options = options; this.readyState = 0; sockets.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  message(event) { this.onmessage?.({ data: JSON.stringify(event) }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

afterEach(() => { while (sockets.length) sockets.pop().close(); });

test('acquires a bundle, attaches the stream, and applies routing updates', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => bundle }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: LifecycleSocket, mysqlLib: driver });
  expect(sockets[0].url).toBe('ws://vip:8080/api/v1/routing/stream');
  expect(sockets[0].options).toEqual({ headers: { authorization: 'Bearer token' } });
  sockets[0].message({ ...bundle, type: 'routing.update', version: 2, generatedAt: '2099-01-01T00:00:00Z', bundleVersion: 2, writer: { host: 'writer-b', port: 3306 }, routes: { primary: [{ host: 'writer-b', port: 3306 }], balanced: bundle.routes.balanced } });
  await new Promise((resolve) => setImmediate(resolve));
  await client.end();
  expect(sockets[0].readyState).toBe(3);
});

test('resynchronizes after shutdown and closes cleanly', async () => {
  const fallback = { ...bundle, bundleVersion: 3, writer: { host: 'writer-c', port: 3306 }, routes: { primary: [{ host: 'writer-c', port: 3306 }], balanced: bundle.routes.balanced } };
  const fetchImpl = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => bundle }).mockResolvedValueOnce({ ok: true, json: async () => fallback });
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: LifecycleSocket, mysqlLib: driver });
  sockets[0].message({ type: 'routing.shutdown', version: 2, generatedAt: '2099-01-01T00:00:00Z', node: 'writer-a', reason: 'maintenance', reconnect: false, reconnectDeadlineMs: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  await client.end();
  expect(sockets[0].readyState).toBe(3);
});
