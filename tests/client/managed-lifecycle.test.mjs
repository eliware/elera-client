import { jest } from '@jest/globals';
import { createDb } from '../../src/client/managed.mjs';

const bundle = { apiVersion: 'v1', application: 'app', database: 'db', identity: 'runtime', credentialName: 'rw', scopes: ['read', 'write'], credentials: { username: 'u', password: 'p' }, routes: { primary: [{ host: 'writer-a', port: 3306 }], balanced: [{ host: 'reader-a', port: 3306 }] }, writer: { host: 'writer-a', port: 3306 }, readers: [{ host: 'reader-a', port: 3306 }], failover: [], bundleVersion: 1, nodeIdentity: 'writer-a', ports: { sql: 3306, http: 8080 }, expiresAt: '2099-01-01T00:00:00Z' };
const driver = { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) };
const sockets = [];

class LifecycleSocket {
  constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  message(event) { this.onmessage?.({ data: JSON.stringify(event) }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

afterEach(() => { while (sockets.length) sockets.pop().close(); });

test('acquires a bundle, attaches the stream, and applies routing updates', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => bundle }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: LifecycleSocket, mysqlLib: driver });
  expect(sockets[0].url).toContain('/api/v1/routing/stream?token=token');
  sockets[0].message({ type: 'routing.update', version: 2, application: 'app', database: 'db', writer: { host: 'writer-b', port: 3306 }, routes: { primary: [{ host: 'writer-b', port: 3306 }], balanced: bundle.routes.balanced } });
  await new Promise((resolve) => setImmediate(resolve));
  expect(client.bundle().writer.host).toBe('writer-b');
  await client.close();
});

test('resynchronizes after shutdown and closes cleanly', async () => {
  const fallback = { ...bundle, bundleVersion: 3, writer: { host: 'writer-c', port: 3306 }, routes: { primary: [{ host: 'writer-c', port: 3306 }], balanced: bundle.routes.balanced } };
  const fetchImpl = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => bundle }).mockResolvedValueOnce({ ok: true, json: async () => fallback });
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: LifecycleSocket, mysqlLib: driver });
  sockets[0].message({ type: 'routing.shutdown', node: 'writer-a', reconnect: false });
  await new Promise((resolve) => setImmediate(resolve));
  expect(client.bundle().bundleVersion).toBe(3);
  await client.close();
  expect(client.availability().state).toBe('cluster-unavailable');
});
