import { expect, jest, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { bundle, driver, profile } from './fixtures.mjs';

test('maps non-retryable SQL errors while applying credential overlays', async () => { const failure = Object.assign(new Error('bad query'), { code: 'ER_PARSE_ERROR' }); const client = await createDb({ primary: profile, balanced: { host: 'read', port: 3306 }, credentialProvider: async () => ({ user: 'u', password: 'p' }), mysqlLib: driver({ query: jest.fn(async () => { throw failure; }) }) }); await expect(client.query('SELECT 1', [], { route: 'balanced' })).rejects.toThrow('bad query'); await expect(client.refresh({ ...bundle, routes: { primary: [{ host: 'new', port: 3306 }], balanced: [] } })).resolves.toMatchObject({ bundleVersion: 1 }); await client.close(); });
