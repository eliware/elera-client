import { expect, test, jest } from '@jest/globals';
import { createBundleRefresh } from '../../../src/client/create-db/bundle-refresh.mjs';

test('refreshes writer and reader pools and drains obsolete pools', async () => {
  const oldPrimary = { nodes: [{ drain: jest.fn() }], waitForIdle: jest.fn(async () => {}), close: jest.fn(async () => {}) };
  const oldBalanced = { nodes: [{ drain: jest.fn() }], waitForIdle: jest.fn(async () => {}), close: jest.fn(async () => {}) };
  const nextPrimary = { nodes: [] };
  const nextBalanced = { nodes: [] };
  let active = { bundleVersion: 1 };
  let primaryPool = oldPrimary;
  let balancedPool = oldBalanced;
  let primaryConfig = { host: 'old', database: 'db' };
  const candidate = { bundleVersion: 2, physicalDatabase: 'physical', credentials: { username: 'u', password: 'p' }, writer: { host: 'writer', port: 3306 }, readers: [{ host: 'reader', port: 3306 }], routes: { balanced: [{ host: 'reader', port: 3306 }] } };
  const refresh = createBundleRefresh({ validateBundle: (value) => value, getBundle: () => active, setBundle: (value) => { active = value; }, getPrimaryConfig: () => primaryConfig, setPrimaryConfig: (value) => { primaryConfig = value; }, getPrimaryPool: () => primaryPool, setPrimaryPool: (value) => { primaryPool = value; }, getBalancedPool: () => balancedPool, setBalancedPool: (value) => { balancedPool = value; }, makeRoute: (route) => route === 'primary' ? nextPrimary : nextBalanced, validateProfile: (value) => value, bundleNeedsRefresh: () => false, isOlderBundle: () => false, equivalentPools: () => false, usablePool: () => true, drainTimeoutMs: 10, now: () => 0 });
  await expect(refresh(candidate)).resolves.toEqual({ bundleVersion: 2, refreshRequired: false });
  expect(primaryPool).toBe(nextPrimary);
  expect(balancedPool).toBe(nextBalanced);
  expect(oldPrimary.nodes[0].drain).toHaveBeenCalled();
});
