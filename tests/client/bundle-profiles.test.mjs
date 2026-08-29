import { expect, test } from '@jest/globals';
import { bundleProfiles } from '../../src/client/bundle-profiles.mjs';

test('uses explicit readers for balanced routing', () => {
  const base = { database: 'app' };
  expect(bundleProfiles({ readers: [{ host: 'reader.example', port: 3306 }], routes: { balanced: [{ host: 'old.example', port: 3306 }] } }, 'balanced', base)).toMatchObject([{ host: 'reader.example' }]);
});
