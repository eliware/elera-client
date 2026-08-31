import { expect, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { bundle, driver, profile } from './fixtures.mjs';

test('reports cluster-unavailable when every multi-node primary route is unavailable', async () => {
  const client = await createDb({ primary: profile, bundle: { ...bundle, failover: [{ host: 'backup', port: 3306 }], routes: { ...bundle.routes, primary: [{ host: 'db', port: 3306 }, { host: 'backup', port: 3306 }] } }, mysqlLib: driver() });
  client.drain('db'); client.drain('backup');
  expect(client.availability().state).toBe('cluster-unavailable');
  await client.close();
});

test('reports standalone drain state without claiming the database operation is cancelled', async () => {
  const client = await createDb({ primary: profile, bundle: { ...bundle, writer: { host: 'db', port: 3306 }, failover: [], routes: { primary: [{ host: 'db', port: 3306 }], balanced: [] } }, mysqlLib: driver() });
  client.drain('db');
  expect(client.availability()).toMatchObject({ state: 'standalone-unavailable', routes: { primary: false } });
  await client.close();
});

test('reports an unavailable standalone route as a server error', async () => {
  const client = await createDb({ primary: profile, bundle: { ...bundle, writer: { host: 'only-node', port: 3306 }, routes: { primary: [{ host: 'only-node', port: 3306 }], balanced: [] } }, mysqlLib: driver() });
  client.drain('only-node', 1000);
  await expect(client.query('SELECT 1', undefined, { route: 'primary' })).rejects.toMatchObject({ code: 'SERVER_UNAVAILABLE' });
  await client.close();
});
