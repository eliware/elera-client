import { expect, test, jest } from '@jest/globals';
import { exposeManagedClient } from '../../../src/client/managed/public-api.mjs';

test('exposes only the managed mysql2-compatible client surface', () => {
  const client = { query: jest.fn(), execute: jest.fn(), getConnection: jest.fn(), probe: jest.fn(), secret: 'hidden' };
  const end = jest.fn();
  const exposed = exposeManagedClient(client, end);
  expect(Object.keys(exposed).sort()).toEqual(['end', 'execute', 'getConnection', 'probe', 'query']);
  expect(exposed.query).toBe(client.query);
  expect(exposed.end).toBe(end);
  expect(exposed.secret).toBeUndefined();
});
