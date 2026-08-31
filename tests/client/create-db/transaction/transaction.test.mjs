import { expect, test, jest } from '@jest/globals';
import { createTransactionOperation } from '../../../../src/client/create-db/transaction.mjs';
import { createDb } from '../../../../src/client/create-db/index.mjs';
import { bundle, connection, driver, profile } from '../fixtures.mjs';

test('commits a successful transaction and releases its connection', async () => {
  const connection = { beginTransaction: jest.fn(), query: jest.fn().mockResolvedValue(['rows']), execute: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  const operation = createTransactionOperation({ primaryPool: { choose: () => ({ getConnection: async () => connection }) }, timed: (callback) => callback() });
  await expect(operation(async (tx) => tx.query('SELECT 1'))).resolves.toEqual(['rows']);
  expect(connection.beginTransaction).toHaveBeenCalled();
  expect(connection.commit).toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalled();
});

test('rolls back and releases when a transaction fails', async () => {
  const connection = { beginTransaction: jest.fn(), query: jest.fn().mockRejectedValue(new Error('sql')), execute: jest.fn(), commit: jest.fn(), rollback: jest.fn().mockResolvedValue(undefined), release: jest.fn() };
  const operation = createTransactionOperation({ primaryPool: { choose: () => ({ getConnection: async () => connection }) }, timed: (callback) => callback() });
  await expect(operation(async (tx) => tx.query('bad'))).rejects.toThrow('sql');
  expect(connection.rollback).toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalled();
});

test('maps a failed application transaction through the managed client', async () => {
  const bad = Object.assign(new Error('boom'), { code: 'ER_LOCK_DEADLOCK' });
  const conn = connection();
  conn.query.mockRejectedValueOnce(bad);
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver({ getConnection: jest.fn(async () => conn) }) });
  await expect(client.transaction(async (tx) => tx.query('UPDATE x'))).rejects.toThrow('boom');
  expect(conn.rollback).toHaveBeenCalled();
  expect(conn.release).toEqual(expect.any(Function));
  await client.close();
});
