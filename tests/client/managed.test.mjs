import { jest } from '@jest/globals';
import { createDb } from '../../src/client/managed.mjs';

const bundle = { apiVersion: 'v1', application: 'app', database: 'app', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'db', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'db', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'db', port: 3306 }] }, expiresAt: '2099-01-01T00:00:00Z' };

class FakeWebSocket {
  constructor() { this.readyState = 0; }
  close() { this.readyState = 3; }
}

test('creates a managed client from endpoint and token only', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => bundle }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
  expect(fetchImpl).toHaveBeenCalledWith('http://vip:8080/api/v1/routing/bundle', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer token' }) }));
  expect(client.bundle()).toBe(bundle);
  await client.close();
});

test('uses managed endpoint and token from the process environment when omitted', async () => {
  const previousEndpoint = process.env.ELERA_API_ENDPOINT;
  const previousToken = process.env.ELERA_API_TOKEN;
  process.env.ELERA_API_ENDPOINT = 'http://env-vip:8080';
  process.env.ELERA_API_TOKEN = 'env-token';
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => bundle }));
  try {
    const client = await createDb({ fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
    expect(fetchImpl).toHaveBeenCalledWith('http://env-vip:8080/api/v1/routing/bundle', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer env-token' }) }));
    await client.close();
  } finally {
    if (previousEndpoint === undefined) delete process.env.ELERA_API_ENDPOINT; else process.env.ELERA_API_ENDPOINT = previousEndpoint;
    if (previousToken === undefined) delete process.env.ELERA_API_TOKEN; else process.env.ELERA_API_TOKEN = previousToken;
  }
});

test('keeps later managed bundles inside the initial authorization context', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ...bundle, application: 'app-a', credentialName: 'runtime', scopes: ['read', 'write'] }) }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
  await expect(client.refresh({ ...client.bundle(), application: 'app-b', bundleVersion: 2 })).rejects.toThrow('application');
  await client.close();
});

test('requires an endpoint and token when no managed options are supplied', async () => { await expect(createDb()).rejects.toThrow(); });
