import { expect, test } from '@jest/globals';
import { validateBundle, validateRoutingEvent } from '@eliware/elera-lib';

test('consumes the shared routing helpers from the published library boundary', () => {
  expect(validateBundle({ apiVersion: 'v1', application: 'app', database: 'db', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'writer', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'writer', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [] }, expiresAt: '2099-01-01T00:00:00Z' })).toBeTruthy();
  expect(validateRoutingEvent({ type: 'routing.recovery', version: 1, generatedAt: '2099-01-01T00:00:00Z', node: 'writer', context: {} })).toMatchObject({ type: 'routing.recovery' });
});

const strictBundle = (overrides = {}) => ({ apiVersion: 'v1', application: 'app', database: 'db', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'writer', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'writer', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'writer', port: 3306 }], balanced: [{ host: 'writer', port: 3306 }] }, expiresAt: '2099-01-01T00:00:00Z', ...overrides });

test('shared Bundle v1 validation rejects numeric-string ports', () => {
  expect(() => validateBundle(strictBundle({ ports: { sql: '3306', http: 8080 } }))).toThrow();
});

test('shared Bundle v1 validation requires both route arrays', () => {
  expect(() => validateBundle(strictBundle({ routes: { primary: [{ host: 'writer', port: 3306 }] } }))).toThrow();
});
