import { expect, test, jest } from '@jest/globals';
import { createRoutingEventHandler } from '../../../src/client/create-db/routing-events.mjs';

test('handles routing updates and lifecycle events across pools', async () => {
  const refresh = jest.fn();
  const pool = { drain: jest.fn(), recover: jest.fn() };
  const handle = createRoutingEventHandler({ refresh, getPools: () => [pool], drainTimeoutMs: 20 });
  await handle({ type: 'routing.update', bundleVersion: 2 });
  await handle({ type: 'routing.drain', node: 'db', drainTimeoutMs: 10 });
  await handle({ type: 'routing.shutdown', node: 'db', reconnectDeadlineMs: 5 });
  await handle({ type: 'routing.recovery', node: 'db' });
  expect(refresh).toHaveBeenCalledWith({ bundleVersion: 2 });
  expect(pool.drain).toHaveBeenCalledTimes(2);
  expect(pool.recover).toHaveBeenCalledWith('db', 20);
});
