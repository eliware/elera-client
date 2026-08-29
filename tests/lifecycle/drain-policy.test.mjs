import { expect, test } from '@jest/globals';
import { CLIENT_DRAIN_TIMEOUT_MS, clientDrainTimeout } from '@eliware/elera-lib';

test('caps client drain time at 45 seconds', () => {
  expect(clientDrainTimeout(90000)).toBe(CLIENT_DRAIN_TIMEOUT_MS);
  expect(clientDrainTimeout(1000)).toBe(1000);
  expect(() => clientDrainTimeout(-1)).toThrow('non-negative');
});
