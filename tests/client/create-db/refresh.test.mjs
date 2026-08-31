import { expect, jest, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { bundle, driver, profile } from './fixtures.mjs';

test('refreshes a bundle with a balanced route and handles partial stream events', async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await expect(client.refresh(bundle)).resolves.toMatchObject({ bundleVersion: 'v1' });
  const handler = {}; await client.attachRoutingStream({ connect: async () => {}, setOnUpdate: (value) => { handler.value = value; } });
  await handler.value({ ...bundle, type: 'routing.update', routes: { ...bundle.routes, primary: [{ host: 'new', port: 3306 }] }, database: 'app' });
  await handler.value({ type: 'routing.resync', bundle: { ...bundle, writer: { host: 'resynced', port: 3306 }, routes: { ...bundle.routes, primary: [{ host: 'resynced', port: 3306 }] } } });
  await client.close();
});

test('refreshes a primary-only client without creating a balanced pool', async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await client.refresh({ ...bundle, routes: { primary: [{ host: 'new', port: 3306 }], balanced: [] }, readers: [], bundleVersion: 'v2' });
  expect(client.nodeStates().filter((node) => node.route === 'balanced')).toHaveLength(0);
  await client.close();
});

test('drains a configured balanced pool when a refreshed bundle has no readers', async () => {
  const client = await createDb({ primary: profile, balanced: { host: 'reader', port: 3306 }, bundle, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, readers: [], routes: { primary: [bundle.writer], balanced: [] }, bundleVersion: 'v2' })).resolves.toMatchObject({ bundleVersion: 'v2' });
  expect(client.availability().routes.balanced).toBe(false);
  await client.close();
});

test('rejects a refreshed bundle without a writer', async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, writer: undefined, routes: { primary: [], balanced: bundle.routes.balanced }, bundleVersion: 2 })).rejects.toThrow('writer');
  await client.close();
});

test('does not replace a newer bundle with an older resync', async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, bundleVersion: 2 })).resolves.toMatchObject({ bundleVersion: 2 });
  await expect(client.refresh({ ...bundle, bundleVersion: 1 })).resolves.toMatchObject({ bundleVersion: 2 });
  await client.close();
});
