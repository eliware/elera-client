import { expect, test, jest } from '@jest/globals';
import { createPoolDelegation } from '../../../src/pools/route-pool/delegation.mjs';

test('delegates query and execute to the selected node', async () => {
  const node = { query: jest.fn().mockResolvedValue(['rows']), execute: jest.fn().mockResolvedValue(['result']) };
  const delegation = createPoolDelegation(() => node);
  await expect(delegation.query('SELECT 1', [1])).resolves.toEqual(['rows']);
  await expect(delegation.execute('SELECT ?', [1])).resolves.toEqual(['result']);
  expect(node.query).toHaveBeenCalledWith('SELECT 1', [1]);
  expect(node.execute).toHaveBeenCalledWith('SELECT ?', [1]);
});
