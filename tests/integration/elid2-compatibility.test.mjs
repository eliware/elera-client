import { expect, jest, test } from '@jest/globals';
import { createDb } from '../../src/index.mjs';

const bundle = { apiVersion: 'v1', application: 'elid2', database: 'app', physicalDatabase: 'physical_app', identity: 'runtime', credentials: { username: 'internal-user', password: 'internal-password' }, routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [] }, writer: { host: 'writer', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'writer', ports: { sql: 3306, http: 8080 }, expiresAt: '2099-01-01T00:00:00Z' };
class ClosedSocket { constructor() { this.readyState = 3; } close() {} }

test('supports Elid2 database calls without an application migration adapter', async () => {
  const release = jest.fn();
  const connection = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), query: jest.fn(async () => [[{ ok: 1 }], [{ name: 'ok' }]]), execute: jest.fn(async () => [{ affectedRows: 1 }, []]), release };
  const pool = { query: jest.fn(async () => [[{ ok: 1 }], [{ name: 'ok' }]]), execute: jest.fn(async () => [{ affectedRows: 1 }, []]), getConnection: jest.fn(async () => connection), end: jest.fn(async () => {}) };
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const db = await createDb({ env: { ELERA_API_URL: 'http://elera.test', ELERA_API_TOKEN: 'application-token' }, fetchImpl, WebSocketImpl: ClosedSocket, mysqlLib: { createPool: () => pool } });
  const [result] = await db.execute('SELECT * FROM users WHERE id=?', ['user-id']);
  expect(result).toEqual({ affectedRows: 1 });
  await db.query('SELECT 1', []);
  const tx = await db.getConnection();
  await tx.beginTransaction();
  await tx.execute('UPDATE users SET active=? WHERE id=?', [true, 'user-id']);
  await tx.commit();
  tx.release();
  await db.end();
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.commit).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
  expect(pool.end).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][0]).toBe('http://elera.test/api/v1/routing/bundle');
  expect(JSON.stringify(db)).not.toContain('internal-password');
});
