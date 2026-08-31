import { expect, test, jest } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { profile, bundle, connection, driver } from './fixtures.mjs';

test('creates a client and routes reads, writes, transactions, health, and close', async () => {
  let now = Date.now();
  const log = { debug: jest.fn() };
  const client = await createDb({ primary: profile, balanced: { host: 'read', port: 3306 }, mysqlLib: driver(), log, now: () => now });
  await client.query('SELECT 1');
  await client.query('SELECT 1', [], { route: 'balanced' });
  await client.execute('UPDATE app SET x=1');
  await client.transaction(async (tx) => { await tx.query('SELECT 1'); await tx.execute('UPDATE app SET x=1'); return true; });
  await expect(client.health()).resolves.toMatchObject({ ok: true, route: 'primary' });
  await expect(client.health('balanced')).resolves.toMatchObject({ ok: true, route: 'balanced' });
  expect(log.debug).toHaveBeenCalled();
  now += 1;
  await client.close();
});

test('supports an initially unbundled client bundle view and end alias', async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  expect(client.bundle()).toBeUndefined();
  await client.end();
});




test('covers non-retryable errors, credential overlays, and refresh without balanced routes', async () => {
  const failure = Object.assign(new Error('bad query'), { code: 'ER_PARSE_ERROR' });
  const client = await createDb({ primary: profile, balanced: { host: 'read', port: 3306 }, credentialProvider: async () => ({ user: 'u', password: 'p' }), mysqlLib: driver({ query: jest.fn(async () => { throw failure; }) }) });
  await expect(client.query('SELECT 1', [], { route: 'balanced' })).rejects.toThrow('bad query');
  await expect(client.refresh({ ...bundle, routes: { primary: [{ host: 'new', port: 3306 }], balanced: [] } })).resolves.toMatchObject({ bundleVersion: 'v1' });
  await client.close();
});
test('retries a balanced query when balanced is the default routing policy and tolerates rollback failure', async () => { const retryable = Object.assign(new Error('temporary'), { code: 'ECONNRESET' }); const client = await createDb({ primary: profile, bundle, routing: 'balanced', mysqlLib: driver({ query: jest.fn().mockRejectedValueOnce(retryable).mockResolvedValue([['ok']]) }) }); await expect(client.query('SELECT 1')).resolves.toBeTruthy(); const rollback = connection(); rollback.query.mockRejectedValueOnce(new Error('query')); rollback.rollback.mockRejectedValueOnce(new Error('rollback')); const txClient = await createDb({ primary: profile, mysqlLib: driver({ getConnection: jest.fn(async () => rollback) }) }); await expect(txClient.transaction(async (tx) => tx.query('bad'))).rejects.toThrow(); await txClient.close(); await client.close(); });
test('rejects partial stream updates and supports initial stream resync', async () => { const client = await createDb({ primary: profile, mysqlLib: driver() }); await expect(client.refresh({ ...bundle, credentials: undefined })).rejects.toThrow('credentials'); await client.close(); const streamClient = await createDb({ primary: profile, bundle, mysqlLib: driver() }); let update; await streamClient.attachRoutingStream({ connect: async () => {}, setOnUpdate: (handler) => { update = handler; } }); await expect(update({ type: 'routing.update', routes: { primary: [{ host: 'new', port: 3306 }] }, database: 'app' })).rejects.toThrow(); await update({ type: 'routing.resync', bundle: { ...bundle, writer: { host: 'resynced', port: 3306 }, routes: { ...bundle.routes, primary: [{ host: 'resynced', port: 3306 }] } } }); expect(streamClient.bundle().routes.primary[0].host).toBe('resynced'); await streamClient.close(); });

test('rejects a partial routing event when no active bundle exists', async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  let update;
  await client.attachRoutingStream({ connect: async () => {}, setOnUpdate: (handler) => { update = handler; } });
  await expect(update({ type: 'routing.update', routes: { primary: [{ host: 'writer', port: 3306 }] } })).rejects.toThrow();
  await client.close();
});


test('accepts a complete routing update without relying on active-bundle defaults', async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  let update;
  await client.attachRoutingStream({ connect: async () => {}, setOnUpdate: (handler) => { update = handler; } });
  await update({
    type: 'routing.update',
    apiVersion: 'v1',
    application: 'new-app',
    database: 'new-db',
    identity: 'new-identity',
    credentials: { username: 'new-user', password: 'new-password' },
    writer: { host: 'new-writer', port: 3306 },
    readers: [{ host: 'new-reader', port: 3306 }],
    failover: [{ host: 'new-failover', port: 3306 }],
    bundleVersion: 'v2',
    nodeIdentity: 'new-node',
    ports: { sql: 3306, http: 8080 },
    physicalDatabase: 'new-physical-db',
    routes: { primary: [{ host: 'new-writer', port: 3306 }], balanced: [{ host: 'new-reader', port: 3306 }] },
    expiresAt: new Date(Date.now() + 60000).toISOString()
  });
  expect(client.bundle()).toMatchObject({ application: 'new-app', database: 'new-db', physicalDatabase: 'new-physical-db', identity: 'new-identity', nodeIdentity: 'new-node', bundleVersion: 'v2' });
  await client.close();
});




test('finishes an in-flight query while excluding the drained node from new work', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const mysqlLib = { createPool: jest.fn((options) => ({ options, query: jest.fn((sql) => options.host === 'writer' && sql === 'pending' ? pending : Promise.resolve([[options.host]])), execute: jest.fn(async () => [[options.host]]), getConnection: jest.fn(async () => connection()), end: jest.fn(async () => {}) })) };
  const client = await createDb({ primary: profile, bundle: { ...bundle, writer: { host: 'writer', port: 3306 }, failover: [{ host: 'backup', port: 3306 }], routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [] } }, mysqlLib });
  const inFlight = client.query('pending', [], { route: 'primary' });
  const drain = client.drain('writer', 90000);
  await expect(client.execute('UPDATE app SET x=1', [], { route: 'primary' })).resolves.toEqual([['backup']]);
  release([['writer']]);
  await expect(inFlight).resolves.toEqual([['writer']]);
  expect(drain.timeoutMs).toBe(45000);
  await client.close();
});







test('recovery makes a previously unavailable route usable again', async () => {
  const client = await createDb({ primary: profile, bundle: { ...bundle, writer: { host: 'recovering-node', port: 3306 }, routes: { primary: [{ host: 'recovering-node', port: 3306 }], balanced: [] } }, mysqlLib: driver() });
  client.drain('recovering-node', 1000);
  expect(client.availability().state).toBe('standalone-unavailable');
  client.setNodeAvailability('primary', 'recovering-node', true);
  expect(client.availability().state).toBe('available');
  await client.close();
});
