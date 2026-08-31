import { expect, jest, test } from '@jest/globals';
import { createNodeLifecycle } from '../../../src/pools/node-pool/lifecycle.mjs';

test('tracks availability, drain, recovery, and forced closure', async () => {
  const forceClose = jest.fn();
  const lifecycle = createNodeLifecycle({ now: () => 1, onForceClose: forceClose, timeoutMs: 1 });
  expect(lifecycle.available).toBe(true);
  lifecycle.unavailable = true;
  expect(lifecycle.available).toBe(false);
  lifecycle.unavailable = false;
  expect(lifecycle.available).toBe(true);
  lifecycle.begin();
  const idle = lifecycle.waitForIdle(10);
  lifecycle.end();
  await expect(idle).resolves.toBe(true);
  lifecycle.drain(1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(forceClose).toHaveBeenCalled();
  lifecycle.recover();
  lifecycle.clear();
});
