import { expect, test } from '@jest/globals';
import { compareBundleVersions } from '@eliware/elera-lib';

test('compares numeric bundle versions instead of lexical order', () => {
  expect(compareBundleVersions('v10', 'v9')).toBeGreaterThan(0);
  expect(compareBundleVersions(2, 10)).toBeLessThan(0);
  expect(compareBundleVersions('v1.2', 'v1.2.3')).toBeLessThan(0);
  expect(compareBundleVersions('v1.2.3', 'v1.2')).toBeGreaterThan(0);
  expect(compareBundleVersions('release-a', 'release-b')).toBeLessThan(0);
});
