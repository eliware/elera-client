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













