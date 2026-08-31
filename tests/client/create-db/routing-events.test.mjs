import { expect, test, jest } from '@jest/globals';
import { createRoutingEventHandler } from '../../../src/client/create-db/routing-events.mjs';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { bundle, driver, profile } from './fixtures.mjs';

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

test('rejects incomplete stream updates and accepts a complete update', async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  let update;
  await client.attachRoutingStream({ connect: async () => {}, setOnUpdate: (handler) => { update = handler; } });
  await expect(update({ type: 'routing.update', routes: { primary: [{ host: 'next', port: 3306 }] } })).rejects.toThrow();
  await update({ ...bundle, type: 'routing.update', bundleVersion: 'v2', routes: { ...bundle.routes, primary: [{ host: 'versioned-writer', port: 3306 }] } });
  expect(client.bundle()).toMatchObject({ bundleVersion: 'v2', writer: bundle.writer });
  await client.close();
});
