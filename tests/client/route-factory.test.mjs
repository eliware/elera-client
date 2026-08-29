import { createRouteFactory } from '../../src/client/route-factory.mjs';

test('uses the fallback profile when no usable bundle is supplied', () => {
  const mysqlLib = { createPool: () => ({ getConnection: async () => ({ release() {} }), end: async () => {} }) };
  const factory = createRouteFactory({ bundle: undefined, now: () => 0, mysqlLib, log: {}, quarantineMs: 1 });
  const result = factory('primary', { host: 'localhost', port: 3306, user: 'u', password: 'p' });
  expect(result.nodes).toHaveLength(1);
  expect(result.nodes[0].host).toBe('localhost');
});

test('uses bundle route profiles only while the bundle is current', () => {
  const mysqlLib = { createPool: () => ({ getConnection: async () => ({ release() {} }), end: async () => {} }) };
  const base = { host: 'fallback', port: 3306, user: 'u', password: 'p' };
  const factory = createRouteFactory({ bundle: { routes: { primary: [{ host: 'from-bundle', port: 3306 }] }, expiresAt: new Date(1000).toISOString() }, now: () => 0, mysqlLib, log: {}, quarantineMs: 1 });
  expect(factory('primary', base).nodes[0].host).toBe('from-bundle');
  expect(factory('missing', base).nodes[0].host).toBe('fallback');
  const expired = createRouteFactory({ bundle: { routes: { primary: [{ host: 'stale', port: 3306 }] }, expiresAt: new Date(0).toISOString() }, now: () => 1000, mysqlLib, log: {}, quarantineMs: 1 });
  expect(expired('primary', base).nodes[0].host).toBe('fallback');
});
test('builds primary routes from explicit writer and ordered failover fields', () => {
  const mysqlLib = { createPool: () => ({ getConnection: async () => ({ release() {} }), end: async () => {} }) };
  const factory = createRouteFactory({ bundle: { writer: { host: 'writer', port: 3306 }, failover: [{ host: 'backup-a' }, { host: 'backup-b' }], routes: { balanced: [] }, expiresAt: new Date(1000).toISOString() }, now: () => 0, mysqlLib, log: {}, quarantineMs: 1 });
  expect(factory('primary', { host: 'fallback', port: 3306, user: 'u', password: 'p' }).nodes.map((node) => node.host)).toEqual(['writer', 'backup-a', 'backup-b']);
});
test('accepts an explicit writer without a failover list', () => {
  const mysqlLib = { createPool: () => ({ getConnection: async () => ({ release() {} }), end: async () => {} }) };
  const factory = createRouteFactory({ bundle: { writer: { host: 'writer' }, routes: { balanced: [] }, expiresAt: new Date(1000).toISOString() }, now: () => 0, mysqlLib, log: {}, quarantineMs: 1 });
  expect(factory('primary', { host: 'fallback', port: 3306, user: 'u', password: 'p' }).nodes[0].host).toBe('writer');
});
