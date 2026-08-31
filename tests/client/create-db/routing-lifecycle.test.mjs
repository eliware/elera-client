import { expect, jest, test } from '@jest/globals';
import { createDb } from '../../../src/client/create-db/index.mjs';
import { bundle, driver, profile } from './fixtures.mjs';

test('drains both route pools and exposes node lifecycle state', async () => { const client = await createDb({ primary: profile, balanced: { host: 'read', port: 3306 }, bundle, mysqlLib: driver() }); const operation = client.drain('read', 1); expect(client.nodeStates().find((node) => node.host === 'read')).toMatchObject({ state: 'draining', available: false }); await expect(operation.wait()).resolves.toEqual([expect.any(Array), expect.any(Array)]); await operation.forceClose(); await client.close(); });
test('does not retry an uncertain write on another node', async () => { const failure = Object.assign(new Error('connection lost'), { code: 'ECONNRESET' }); const query = jest.fn().mockRejectedValue(failure); const client = await createDb({ primary: profile, balanced: { host: 'read', port: 3306 }, bundle, mysqlLib: driver({ query }) }); await expect(client.query('UPDATE app SET value = 1', [], { route: 'balanced' })).rejects.toThrow(); expect(query).toHaveBeenCalledTimes(1); await client.close(); });
