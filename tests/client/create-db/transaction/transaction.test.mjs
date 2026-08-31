import { expect, test, jest } from '@jest/globals';
import { createTransactionOperation } from '../../../../src/client/create-db/transaction.mjs';

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
