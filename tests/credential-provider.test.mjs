import { expect, test } from '@jest/globals';
import { validateProfile, redactedProfile } from '../src/config.mjs';
import { resolveCredentials, credentialContext } from '../src/credential-provider.mjs';
import { SqlClientError, classifyError, asSqlError } from '../src/errors.mjs';

test('applies default profile options and redacts profiles without optional values', async () => {
  const { validateProfile, redactedProfile } = await import('../src/config.mjs');
  expect(validateProfile({ host: 'db', database: 'app' })).toMatchObject({ port: 3306, options: { connectionLimit: 10 } });
  expect(redactedProfile({ host: 'db', database: 'app' })).toMatchObject({ host: 'db', database: 'app', options: {} });
});

const valid = { host: 'db', user: 'u', password: 'p', database: 'app' };
test('validates profiles and redacts secret connection fields', () => { const profile = validateProfile({ ...valid, options: { ssl: { key: 'private', ca: 'ca' } } }); expect(profile.port).toBe(3306); expect(redactedProfile(profile)).toMatchObject({ host: 'db', options: { ssl: { ca: 'ca' } } }); for (const value of [null, { ...valid, host: 1 }, { ...valid, user: 1 }, { ...valid, password: 1 }, { ...valid, database: '' }, { ...valid, port: 0 }, { ...valid, options: { ssl: true } }]) expect(() => validateProfile(value)).toThrow(); });
test('resolves credential providers and creates request context', async () => { expect(await resolveCredentials(undefined, {})).toEqual({}); await expect(resolveCredentials('bad', {})).rejects.toThrow(); await expect(resolveCredentials(async () => null, {})).rejects.toThrow(); await expect(resolveCredentials(async () => ({ user: 'u' }), {})).rejects.toThrow(); await expect(resolveCredentials(async (context) => ({ user: context.identity, password: 'p' }), { identity: 'id' })).resolves.toEqual({ user: 'id', password: 'p' }); expect(credentialContext(valid, {})).toEqual({ database: 'app', identity: null, route: 'primary' }); });
test('classifies and wraps SQL failures', () => { expect(classifyError({ code: 'ECONNRESET' }).retryable).toBe(true); expect(classifyError({ code: 'ER_ACCESS_DENIED_ERROR' }).code).toBe('AUTHENTICATION_ERROR'); expect(classifyError({ code: 'OTHER' }).code).toBe('OTHER'); expect(classifyError({}).code).toBe('SQL_ERROR'); const original = new Error('x'); const wrapped = asSqlError(original); expect(wrapped).toBeInstanceOf(SqlClientError); expect(asSqlError(wrapped)).toBe(wrapped); });
