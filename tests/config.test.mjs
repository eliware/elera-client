import { expect, test } from '@jest/globals';
import { redactedProfile, validateProfile } from '../src/config.mjs';

test('validates profile defaults and redacts secrets', () => {
  const profile = validateProfile({ host: 'db', user: 'u', password: 'p', database: 'app' });
  expect(profile.port).toBe(3306);
  expect(redactedProfile(profile)).not.toHaveProperty('password');
});

test('rejects invalid profile values', () => {
  expect(() => validateProfile()).toThrow();
  expect(() => validateProfile({ host: 'db', database: 'app', port: 0 })).toThrow();
  expect(() => validateProfile({ host: 'db', database: 'app', options: { connectionLimit: 0 } })).toThrow();
});
