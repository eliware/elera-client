import { expect, jest, test } from '@jest/globals';
import { createTransactionOperation } from '../../../src/client/create-db/transaction.mjs';

const run = (connection) => createTransactionOperation({ primaryPool: { choose: () => ({ getConnection: async () => connection }) }, timed: (callback) => callback() });

test('commits query and execute work and releases the pinned connection', async () => {
  const connection = { beginTransaction: jest.fn(), query: jest.fn(async () => ['rows']), execute: jest.fn(async () => ['result']), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  await expect(run(connection)(async (tx) => [await tx.query('SELECT 1', []), await tx.execute('UPDATE t SET x=?', [1])])).resolves.toEqual([['rows'], ['result']]);
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.commit).toHaveBeenCalledTimes(1);
  expect(connection.rollback).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test('rolls back and maps callback failures before releasing', async () => {
  const failure = Object.assign(new Error('transaction failed'), { code: 'ER_LOCK_DEADLOCK' });
  const connection = { beginTransaction: jest.fn(), query: jest.fn(), execute: jest.fn(), commit: jest.fn(), rollback: jest.fn(async () => {}), release: jest.fn() };
  await expect(run(connection)(async () => { throw failure; })).rejects.toMatchObject({ message: 'transaction failed', code: 'ER_LOCK_DEADLOCK' });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test('preserves the original failure when rollback also fails', async () => {
  const failure = new Error('query failed');
  const connection = { beginTransaction: jest.fn(), query: jest.fn(), execute: jest.fn(), commit: jest.fn(), rollback: jest.fn().mockRejectedValue(new Error('rollback failed')), release: jest.fn() };
  await expect(run(connection)(async () => { throw failure; })).rejects.toMatchObject({ message: 'query failed' });
  expect(connection.release).toHaveBeenCalledTimes(1);
});
