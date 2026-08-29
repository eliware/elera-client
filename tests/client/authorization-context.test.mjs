import { expect, test } from '@jest/globals';
import { validateTokenContext } from '../../src/client/authorization-context.mjs';

const bundle = { application: 'billing', database: 'core', credentialName: 'writer', identity: 'client', scopes: ['read', 'write'] };
test('accepts matching single-database token context', () => expect(validateTokenContext(bundle, { application: 'billing', database: 'core', credentialName: 'writer', identity: 'client', scopes: ['read'] })).toBe(bundle));
test('rejects database, identity, and scope mismatches', () => { expect(() => validateTokenContext(bundle, { database: 'other' })).toThrow('database'); expect(() => validateTokenContext(bundle, { identity: 'other' })).toThrow('identity'); expect(() => validateTokenContext(bundle, { scopes: ['admin'] })).toThrow('scopes'); });
test('rejects a missing bundle', () => expect(() => validateTokenContext(undefined)).toThrow('required'));
test('keeps two token contexts isolated to their own databases and users', () => {
  const reporting = { ...bundle, database: 'reporting', credentialName: 'reader', scopes: ['read'] };
  expect(validateTokenContext(bundle, { application: 'billing', database: 'core', credentialName: 'writer' }).database).toBe('core');
  expect(validateTokenContext(reporting, { application: 'billing', database: 'reporting', credentialName: 'reader', scopes: ['read'] }).credentialName).toBe('reader');
  expect(() => validateTokenContext(reporting, { database: 'core' })).toThrow('database');
});
