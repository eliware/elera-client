import { expect, test, jest } from '@jest/globals';
import { createPoolShutdown } from '../../../src/client/create-db/shutdown.mjs';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { profile } from './fixtures.mjs';

test('drains, waits for idle, and closes pools once', async () => {
  const pool = { drain: jest.fn(), waitForIdle: jest.fn(async () => {}), close: jest.fn(async () => {}) };
  const shutdown = createPoolShutdown({ getPools: () => [pool], drainTimeoutMs: 10, metrics: { stop: jest.fn() } });
  await Promise.all([shutdown.close(), shutdown.close()]);
  expect(pool.drain).toHaveBeenCalledWith(10);
  expect(pool.waitForIdle).toHaveBeenCalledWith(10);
  expect(pool.close).toHaveBeenCalledTimes(1);
});

test('shutdown shares concurrent close completion', async () => {
  const end = jest.fn(async () => {});
  const client = await createDb({ primary: profile, mysqlLib: { createPool: () => ({ query: async () => [[]], execute: async () => [[]], getConnection: async () => ({}), end }) } });
  const first = client.close(); const second = client.close();
  await Promise.all([first, second]);
  expect(end).toHaveBeenCalledTimes(1);
});
