import { expect, test, jest } from '@jest/globals';
import { createDb } from '../../src/index.mjs';

const bundle = {
  apiVersion: 'v1', application: 'smoke', database: 'smoke', identity: 'runtime',
  credentials: { username: 'u', password: 'p' }, writer: { host: 'db', port: 3306 },
  readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'db',
  ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'db', port: 3306 }], balanced: [] },
  expiresAt: '2099-01-01T00:00:00Z'
};

class ClosedSocket {
  constructor() { this.readyState = 3; }
  close() {}
}

test('public entrypoint creates a managed client with only endpoint and token', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const mysqlLib = { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) };
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'app-token', fetchImpl, WebSocketImpl: ClosedSocket, mysqlLib });
  expect(fetchImpl).toHaveBeenCalledWith('http://vip:8080/api/v1/routing/bundle', expect.any(Object));
  expect(client.getConnection).toEqual(expect.any(Function));
  await client.end();
});
