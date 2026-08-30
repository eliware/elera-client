import { CLIENT_DRAIN_TIMEOUT_MS, clientDrainTimeout } from '../../src/client/drain-policy.mjs';

test('caps client drain timeouts at the protocol maximum', () => {
  expect(clientDrainTimeout(90000)).toBe(CLIENT_DRAIN_TIMEOUT_MS);
  expect(clientDrainTimeout(1000)).toBe(1000);
});

test('rejects invalid client drain timeouts', () => {
  expect(() => clientDrainTimeout(-1)).toThrow('non-negative');
  expect(() => clientDrainTimeout('nope')).toThrow('non-negative');
});
