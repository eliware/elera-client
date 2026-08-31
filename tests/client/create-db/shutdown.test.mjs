import { expect, test, jest } from '@jest/globals';
import { createPoolShutdown } from '../../../src/client/create-db/shutdown.mjs';

test('drains, waits for idle, and closes pools once', async () => {
  const pool = { drain: jest.fn(), waitForIdle: jest.fn(async () => {}), close: jest.fn(async () => {}) };
  const shutdown = createPoolShutdown({ getPools: () => [pool], drainTimeoutMs: 10, metrics: { stop: jest.fn() } });
  await Promise.all([shutdown.close(), shutdown.close()]);
  expect(pool.drain).toHaveBeenCalledWith(10);
  expect(pool.waitForIdle).toHaveBeenCalledWith(10);
  expect(pool.close).toHaveBeenCalledTimes(1);
});
