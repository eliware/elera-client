import { expect, test, jest } from '@jest/globals';
import { resolveManagedConfig, createBundleFetcher } from '../../../src/client/managed/configuration.mjs';

test('resolves managed credentials from ELERA environment variables', () => {
  expect(resolveManagedConfig({ env: { ELERA_API_URL: 'https://env', ELERA_API_TOKEN: 'env-token' } })).toEqual({ endpoint: 'https://env', token: 'env-token' });
});

test('explicit managed options override environment values', () => {
  expect(resolveManagedConfig({ endpoint: 'https://explicit', token: 'explicit-token', env: { ELERA_API_URL: 'https://env', ELERA_API_TOKEN: 'env-token' } })).toEqual({ endpoint: 'https://explicit', token: 'explicit-token' });
});

test('creates a bundle fetcher with the configured endpoint and token', async () => {
  const bundle = { apiVersion: 'v1', application: 'app', database: 'app', physicalDatabase: 'physical_app', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'db', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'db', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'db', port: 3306 }], balanced: [] }, expiresAt: '2099-01-01T00:00:00Z' };
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, operation: 'routing.bundle', data: bundle }) }));
  const fetcher = createBundleFetcher({ endpoint: 'https://api', token: 'token', fetchImpl, fetchPath: '/bundle' });
  await expect(fetcher()).resolves.toMatchObject({ application: 'app', database: 'app' });
  expect(fetchImpl).toHaveBeenCalled();
});
