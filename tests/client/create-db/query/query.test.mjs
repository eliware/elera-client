import { expect, test, jest } from '@jest/globals';
import { createQueryExecution } from '../../../../src/client/create-db/query-execution.mjs';

test('routes query and execute through the selected pool', async () => {
  const pool = { query: jest.fn().mockResolvedValue(['rows']), execute: jest.fn().mockResolvedValue(['result']) };
  const timed = (operation) => operation();
  const execution = createQueryExecution({ selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }), timed, metrics: {}, balancedPool: pool, routeFor: () => 'primary', routing: 'auto' });
  await expect(execution.query('SELECT 1', [])).resolves.toEqual(['rows']);
  await expect(execution.execute('UPDATE t SET x=?', [1])).resolves.toEqual(['result']);
});
