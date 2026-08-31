import { jest } from '@jest/globals';
import { createDb } from '../../src/client/managed.mjs';

const bundle = { apiVersion: 'v1', application: 'app', database: 'app', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'db', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'db', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'db', port: 3306 }], balanced: [] }, expiresAt: '2099-01-01T00:00:00Z' };

class FakeWebSocket {
  constructor() { this.readyState = 0; }
  close() { this.readyState = 3; }
}

test('creates a managed client from endpoint and token only', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
  expect(fetchImpl).toHaveBeenCalledWith('http://vip:8080/api/v1/routing/bundle', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer token' }) }));
  expect(client).toEqual(expect.objectContaining({ query: expect.any(Function), execute: expect.any(Function), getConnection: expect.any(Function), end: expect.any(Function) }));
  await client.end();
});

test('enables managed telemetry by default and accepts an explicit telemetry sink', async () => {
  const telemetry = { start: jest.fn(), stop: jest.fn() };
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', telemetry, fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
  expect(telemetry.start).toHaveBeenCalledTimes(1);
  await client.end();
  expect(telemetry.stop).toHaveBeenCalledTimes(1);
});

test('uses managed endpoint and token from the process environment when omitted', async () => {
  const previousEndpoint = process.env.ELERA_API_URL;
  const previousToken = process.env.ELERA_API_TOKEN;
  process.env.ELERA_API_URL = 'http://env-vip:8080';
  process.env.ELERA_API_TOKEN = 'env-token';
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  try {
    const client = await createDb({ fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
    expect(fetchImpl).toHaveBeenCalledWith('http://env-vip:8080/api/v1/routing/bundle', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer env-token' }) }));
    await client.end();
  } finally {
    if (previousEndpoint === undefined) delete process.env.ELERA_API_URL; else process.env.ELERA_API_URL = previousEndpoint;
    if (previousToken === undefined) delete process.env.ELERA_API_TOKEN; else process.env.ELERA_API_TOKEN = previousToken;
  }
});

test('createDb({ env }) uses the supplied environment before process defaults', async () => {
  const previousEndpoint = process.env.ELERA_API_URL;
  const previousToken = process.env.ELERA_API_TOKEN;
  process.env.ELERA_API_URL = 'http://wrong-process-endpoint:8080';
  process.env.ELERA_API_TOKEN = 'wrong-process-token';
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  try {
    const client = await createDb({ env: { ELERA_API_URL: 'http://supplied-endpoint:8080', ELERA_API_TOKEN: 'supplied-token' }, fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
    expect(fetchImpl).toHaveBeenCalledWith('http://supplied-endpoint:8080/api/v1/routing/bundle', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer supplied-token' }) }));
    await client.end();
  } finally {
    if (previousEndpoint === undefined) delete process.env.ELERA_API_URL; else process.env.ELERA_API_URL = previousEndpoint;
    if (previousToken === undefined) delete process.env.ELERA_API_TOKEN; else process.env.ELERA_API_TOKEN = previousToken;
  }
});

test('requires an endpoint and token when no managed options are supplied', async () => { await expect(createDb()).rejects.toThrow(); });
test('uses the managed endpoint and bundle even when direct SQL options are supplied', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const client = await createDb({ endpoint: 'http://vip:8080', token: 'token', primary: { host: 'bypass', port: 3306 }, fetchImpl, WebSocketImpl: FakeWebSocket, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end: async () => {} }) } });
  expect(fetchImpl).toHaveBeenCalledWith('http://vip:8080/api/v1/routing/bundle', expect.any(Object));
  await client.end();
});
