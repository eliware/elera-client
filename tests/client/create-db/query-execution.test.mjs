import { expect, jest, test } from '@jest/globals';
import { createQueryExecution } from '../../../src/client/create-db/query-execution.mjs';

const timed = async (operation, metadata) => operation(metadata);

test('executes query and execute with the selected route metadata', async () => {
  const pool = { query: jest.fn(async (sql, values) => [sql, values]), execute: jest.fn(async (sql, values) => [sql, values]) };
  const routeFor = jest.fn(() => 'balanced');
  const execution = createQueryExecution({ selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }), timed, metrics: {}, routeFor, routing: 'auto' });
  await expect(execution.query('SELECT ?', [1], { route: 'balanced' })).resolves.toEqual(['SELECT ?', [1]]);
  await expect(execution.execute('UPDATE t SET x=?', [2])).resolves.toEqual(['UPDATE t SET x=?', [2]]);
  expect(routeFor).toHaveBeenCalledWith('SELECT ?', 'balanced');
  expect(routeFor).toHaveBeenCalledWith('UPDATE t SET x=?', 'auto');
});

test('retries only when selection marks a failed query safe', async () => {
  const failure = new Error('temporary');
  const primary = { query: jest.fn().mockRejectedValue(failure), execute: jest.fn() };
  const balanced = { query: jest.fn(async () => ['retried']) };
  const record = jest.fn();
  const execution = createQueryExecution({ selection: () => ({ choose: () => primary, isSafeBalancedRetry: () => true }), timed, metrics: { record }, getBalancedPool: () => balanced, routeFor: () => 'balanced', routing: 'auto' });
  await expect(execution.query('SELECT 1')).resolves.toEqual(['retried']);
  expect(record).toHaveBeenCalledWith({ retry: true, route: 'balanced' });
});

test('propagates failures when retry is unsafe and supports the legacy pool injection', async () => {
  const failure = new Error('unsafe');
  const pool = { query: jest.fn().mockRejectedValue(failure), execute: jest.fn() };
  const execution = createQueryExecution({ selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }), timed, metrics: {}, balancedPool: pool, routeFor: () => 'primary', routing: 'auto' });
  await expect(execution.query('UPDATE t SET x=1')).rejects.toBe(failure);
});

test('uses the legacy balancedPool fallback when no getter is supplied', async () => {
  const pool = { query: jest.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(['retried']), execute: jest.fn() };
  const execution = createQueryExecution({ selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => true }), timed, metrics: {}, balancedPool: pool, routeFor: () => 'balanced', routing: 'auto' });
  await expect(execution.query('SELECT 1')).resolves.toEqual(['retried']);
});
