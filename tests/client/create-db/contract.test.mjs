import { expect, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db.mjs';

test('exposes the cross-cutting client contract', async () => {
  const pool = { query: async () => [['ok']], execute: async () => [['ok']], getConnection: async () => ({ beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, query: async () => [['ok']], execute: async () => [['ok']], release: () => {} }), end: async () => {} };
  const client = await createDb({ primary: { host: 'db', port: 3306, user: 'u', password: 'p', database: 'app' }, mysqlLib: { createPool: () => pool } });
  expect(client).toEqual(expect.objectContaining({ query: expect.any(Function), execute: expect.any(Function), transaction: expect.any(Function), health: expect.any(Function), refresh: expect.any(Function), close: expect.any(Function) }));
  await client.close();
});
