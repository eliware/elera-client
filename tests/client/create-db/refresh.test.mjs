import { expect, jest, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { bundle, driver, profile } from './fixtures.mjs';

test('refreshes a bundle with a balanced route and handles partial stream events', async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await expect(client.refresh(bundle)).resolves.toMatchObject({ bundleVersion: 1 });
  const handler = {}; await client.attachRoutingStream({ connect: async () => {}, setOnUpdate: (value) => { handler.value = value; } });
  await handler.value({ ...bundle, type: 'routing.update', routes: { ...bundle.routes, primary: [{ host: 'new', port: 3306 }] }, database: 'app' });
  await handler.value({ type: 'routing.resync', bundle: { ...bundle, writer: { host: 'resynced', port: 3306 }, routes: { ...bundle.routes, primary: [{ host: 'resynced', port: 3306 }] } } });
  await client.close();
});

test('refreshes a primary-only client without creating a balanced pool', async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await client.refresh({ ...bundle, routes: { primary: [{ host: 'new', port: 3306 }], balanced: [] }, readers: [], bundleVersion: 2 });
  expect(client.nodeStates().filter((node) => node.route === 'balanced')).toHaveLength(0);
  await client.close();
});

test('drains a configured balanced pool when a refreshed bundle has no readers', async () => {
  const client = await createDb({ primary: profile, balanced: { host: 'reader', port: 3306 }, bundle, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, readers: [], routes: { primary: [bundle.writer], balanced: [] }, bundleVersion: 2 })).resolves.toMatchObject({ bundleVersion: 2 });
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

test('resolves credentials and keeps them out of the public bundle view', async () => { const client = await createDb({ primary: { host: 'fallback', port: 3306, database: 'app' }, bundle, credentialProvider: jest.fn(async () => ({ user: 'u', password: 'p' })), mysqlLib: driver() }); expect(client.bundle()).not.toHaveProperty('credentials'); await client.refresh({ ...bundle, bundleVersion: 2, routes: { primary: [{ host: 'new', port: 3306 }], balanced: [] } }); expect(client.bundle().bundleVersion).toBe(2); await client.close(); });
test('rejects unversioned refreshes and ignores older bundles', async () => { const client = await createDb({ primary: profile, bundle, mysqlLib: driver() }); await expect(client.refresh({ ...bundle, bundleVersion: 0 })).resolves.toMatchObject({ bundleVersion: 1 }); await expect(client.refresh({ ...bundle, bundleVersion: undefined })).rejects.toThrow('bundleVersion'); await client.close(); });
test('replaces writer and reader pools on refresh', async () => { const pools = []; const mysqlLib = { createPool: jest.fn((options) => { const pool = { options, query: jest.fn(async () => [[options.host]]), execute: jest.fn(async () => [[options.host]]), getConnection: jest.fn(async () => ({ release: jest.fn() })), end: jest.fn(async () => {}) }; pools.push(pool); return pool; }) }; const client = await createDb({ primary: profile, mysqlLib }); await client.refresh({ ...bundle, bundleVersion: 2, writer: { host: 'writer-b', port: 3306 }, failover: [{ host: 'writer-c', port: 3306 }], readers: [{ host: 'reader-b', port: 3306 }], routes: { primary: [{ host: 'writer-b', port: 3306 }], balanced: [{ host: 'reader-b', port: 3306 }] } }); expect(client.nodeStates().filter((node) => node.route === 'primary').map((node) => node.host)).toEqual(['writer-b', 'writer-c']); expect(client.nodeStates().filter((node) => node.route === 'balanced').map((node) => node.host)).toEqual(['reader-b']); await client.close(); });
