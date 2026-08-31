import { expect, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { driver, profile, bundle } from './fixtures.mjs';

test('rejects invalid setup and expired bundles', async () => {
  await expect(createDb()).rejects.toThrow('primary connection profile');
  await expect(createDb({ primary: { ...profile, user: '' }, mysqlLib: driver() })).rejects.toThrow('primary.user');
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await expect(createDb({ primary: profile, bundle: { ...bundle, expiresAt: new Date(0).toISOString() }, mysqlLib: driver() })).rejects.toThrow('future');
  await expect(client.refresh({ ...bundle, expiresAt: new Date(0).toISOString() })).rejects.toThrow('future');
  await client.close();
});
