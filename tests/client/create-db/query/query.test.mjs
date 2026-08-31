import { expect, test, jest } from '@jest/globals';
import { createQueryExecution } from '../../../../src/client/create-db/query-execution.mjs';
import { createDb } from '../../../../src/client/create-db/index.mjs';
import { profile, bundle, driver } from '../fixtures.mjs';

test('routes query and execute through the selected pool', async () => {
  const pool = { query: jest.fn().mockResolvedValue(['rows']), execute: jest.fn().mockResolvedValue(['result']) };
  const timed = (operation) => operation();
  const execution = createQueryExecution({ selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }), timed, metrics: {}, balancedPool: pool, routeFor: () => 'primary', routing: 'auto' });
  await expect(execution.query('SELECT 1', [])).resolves.toEqual(['rows']);
  await expect(execution.execute('UPDATE t SET x=?', [1])).resolves.toEqual(['result']);
});

test('retries a retryable balanced query and supports explicit connections', async () => {
  const error = Object.assign(new Error('temporary'), { code: 'ECONNRESET' });
  const pool = driver({ query: jest.fn().mockRejectedValueOnce(error).mockResolvedValue([['ok']]) });
  const client = await createDb({ primary: profile, bundle, credentialProvider: async () => ({ user: 'u', password: 'p' }), mysqlLib: pool });
  await client.query('SELECT 1', [], { route: 'balanced' });
  const explicit = { query: jest.fn(async () => ['explicit']), execute: jest.fn(async () => ['explicit']) };
  await client.query('SELECT 1', [], { connection: explicit });
  await client.execute('SELECT 1', [], { connection: explicit });
  await client.close();
});
