import { expect, jest, test } from '@jest/globals';
import { createDb } from '../../src/index.mjs';

const bundle = { apiVersion: 'v1', application: 'app', database: 'db', identity: 'runtime', credentials: { username: 'u', password: 'p' }, routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [] }, writer: { host: 'writer', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'writer', ports: { sql: 3306, http: 8080 }, expiresAt: '2099-01-01T00:00:00Z' };
class ClosedSocket { constructor() { this.readyState = 3; } close() {} }

const make = async ({ query = jest.fn(), execute = jest.fn(), connection = {} } = {}) => {
  const end = jest.fn(async () => {});
  const mysqlLib = { createPool: () => ({ query, execute, getConnection: async () => connection, end }) };
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const db = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: ClosedSocket, mysqlLib });
  return { db, end };
};

test('forwards mysql2 query and execute tuples, metadata, and parameters unchanged', async () => {
  const rows = [{ id: 1 }]; const fields = [{ name: 'id' }]; const result = [{ affectedRows: 1, insertId: 4 }, fields];
  const query = jest.fn(async () => [rows, fields]); const execute = jest.fn(async () => result);
  const { db } = await make({ query, execute });
  await expect(db.query('SELECT ?', [1])).resolves.toEqual([rows, fields]);
  await expect(db.execute('UPDATE t SET x=?', [2])).resolves.toBe(result);
  expect(query).toHaveBeenCalledWith('SELECT ?', [1]);
  expect(execute).toHaveBeenCalledWith('UPDATE t SET x=?', [2]);
  await db.end();
});

test('exposes mysql2-style SQL error properties without credentials or routing data', async () => {
  const error = Object.assign(new Error('syntax error'), { code: 'ER_PARSE_ERROR', errno: 1064, sqlState: '42000', sqlMessage: 'bad SQL', fatal: false });
  const { db } = await make({ execute: jest.fn(async () => { throw error; }) });
  await expect(db.execute('BAD SQL')).rejects.toMatchObject({ message: 'syntax error', code: 'ER_PARSE_ERROR', errno: 1064, sqlState: '42000', sqlMessage: 'bad SQL', fatal: false });
  await expect(db.execute('BAD SQL')).rejects.not.toHaveProperty('password');
  await db.end();
});

test('getConnection returns a writer connection and preserves transaction lifecycle', async () => {
  const release = jest.fn(); const connection = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), query: jest.fn(), execute: jest.fn(), release };
  const { db } = await make({ connection });
  const acquired = await db.getConnection();
  await acquired.beginTransaction(); await acquired.execute('UPDATE t SET x=?', [1]); await acquired.commit(); acquired.release();
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1); expect(connection.commit).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
  await db.end();
});

test('connection rollback and release remain available for application cleanup', async () => {
  const release = jest.fn(); const connection = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), query: jest.fn(), execute: jest.fn(async () => { throw new Error('constraint'); }), release };
  const { db } = await make({ connection });
  const acquired = await db.getConnection();
  await acquired.beginTransaction();
  await expect(acquired.execute('INSERT INTO t VALUES (?)', [1])).rejects.toThrow('constraint');
  await acquired.rollback();
  acquired.release();
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
  await db.end();
});

test('public query and execute route reads to balanced nodes and writes to the writer', async () => {
  const readRows = [{ id: 1 }]; const writerResult = [{ affectedRows: 1 }];
  const pools = [
    { query: jest.fn(async () => [writerResult, []]), execute: jest.fn(async () => [writerResult, []]), getConnection: async () => ({ release() {} }), end: jest.fn(async () => {}) },
    { query: jest.fn(async () => [readRows, [{ name: 'id' }]]), execute: jest.fn(async () => [readRows, [{ name: 'id' }]]), getConnection: async () => ({ release() {} }), end: jest.fn(async () => {}) }
  ];
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: { ...bundle, routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [{ host: 'reader', port: 3306 }] }, readers: [{ host: 'reader', port: 3306 }] } }) }));
  const db = await createDb({ endpoint: 'http://vip:8080', token: 'token', fetchImpl, WebSocketImpl: ClosedSocket, mysqlLib: { createPool: jest.fn(() => pools.shift()) } });
  await expect(db.query('SELECT 1')).resolves.toEqual([readRows, [{ name: 'id' }]]);
  await expect(db.execute('UPDATE t SET x=?', [2])).resolves.toEqual([writerResult, []]);
  expect(pools).toHaveLength(0);
  await db.end();
});

test('never automatically replays an unsafe write after a retryable failure', async () => {
  const failure = Object.assign(new Error('connection lost'), { code: 'ECONNRESET' });
  const execute = jest.fn(async () => { throw failure; });
  const { db } = await make({ execute });
  await expect(db.execute('UPDATE accounts SET balance=? WHERE id=?', [10, 1])).rejects.toMatchObject({ code: 'ECONNRESET', retryable: true });
  expect(execute).toHaveBeenCalledTimes(1);
  await db.end();
});

test('public client exposes no routing, credential, or node-management controls', async () => {
  const { db } = await make();
  expect(Object.keys(db).sort()).toEqual(['end', 'execute', 'getConnection', 'query']);
  for (const name of ['bundle', 'refresh', 'drain', 'nodeStates', 'setNodeAvailability', 'availability', 'health', 'close', 'telemetry']) expect(db).not.toHaveProperty(name);
  expect(JSON.stringify(db)).not.toMatch(/internal-user|internal-password|credentials|routes|writer|readers/);
  await db.end();
});
