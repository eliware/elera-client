import { expect, test } from '@jest/globals';
import { validateBundle, validateRoutingEvent } from '@eliware/elera-lib';

test('consumes the shared routing helpers from the published library boundary', () => {
  expect(validateBundle({ apiVersion: 'v1', application: 'app', database: 'db', identity: 'id', credentials: { username: 'u', password: 'p' }, writer: { host: 'writer', port: 3306 }, readers: [], failover: [], bundleVersion: 1, nodeIdentity: 'writer', ports: { sql: 3306, http: 8080 }, routes: { primary: [{ host: 'writer', port: 3306 }] }, expiresAt: '2099-01-01T00:00:00Z' })).toBeTruthy();
  expect(validateRoutingEvent({ type: 'routing.recovery', node: 'writer' })).toMatchObject({ type: 'routing.recovery' });
});
