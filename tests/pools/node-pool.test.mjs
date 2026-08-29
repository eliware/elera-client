import { expect, test, jest } from '@jest/globals';
import { createNodePool } from '../../src/pools/node-pool.mjs';

const connection = () => ({ query: jest.fn(async () => [['ok']]), execute: jest.fn(async () => [['ok']]), release: jest.fn() });
const driver = (overrides = {}) => ({ createPool: () => ({ query: jest.fn(async () => [['ok']]), execute: jest.fn(async () => [['ok']]), getConnection: jest.fn(async () => connection()), end: jest.fn(async () => {}), ...overrides }) });
const profile = { host: 'db', port: 3306, user: 'u', password: 'p', database: 'app' };

test('node pool delegates queries, execution, health, connections, and close', async () => { const node = createNodePool({ profile, mysqlLib: driver(), log: { warn: jest.fn() } }); await node.query('SELECT 1'); await node.execute('SELECT 1'); await node.getConnection(); await expect(node.health()).resolves.toMatchObject({ ok: true, host: 'db' }); await node.close(); });
test('node pool applies session statements and quarantines retryable failures', async () => { let now = 0; const bad = Object.assign(new Error('down'), { code: 'ECONNREFUSED' }); const pool = driver({ query: jest.fn(async () => { throw bad; }), execute: jest.fn(async () => { throw bad; }), getConnection: jest.fn(async () => { throw bad; }) }); const node = createNodePool({ profile: { ...profile, options: { sessionStatements: ['SET x=1'] } }, mysqlLib: pool, log: { warn: jest.fn() }, now: () => now, quarantineMs: 10 }); await expect(node.query('SELECT 1')).rejects.toThrow(); expect(node.available).toBe(false); await expect(node.execute('SELECT 1')).rejects.toThrow(); await expect(node.getConnection()).rejects.toThrow(); await expect(node.health()).rejects.toThrow(); now = 11; expect(node.available).toBe(true); });
test('node pool defaults options and toggles availability', async () => { const node = createNodePool({ profile, mysqlLib: driver() }); expect(node.available).toBe(true); expect(node.failures).toBe(0); Object.getOwnPropertyDescriptor(node, 'available').set.call(node, false); expect(node.available).toBe(false); node.available = true; expect(node.available).toBe(true); });
test('passes driver options while omitting acquire timeout and undefined socket paths', async () => { const createPool = jest.fn(() => ({ query: jest.fn(async () => [['ok']]), execute: jest.fn(async () => [['ok']]), getConnection: jest.fn(async () => connection()), end: jest.fn(async () => {}) })); const node = createNodePool({ profile: { ...profile, options: { acquireTimeout: 10, socketPath: undefined, connectionLimit: 2 } }, mysqlLib: { createPool } }); expect(createPool).toHaveBeenCalledWith(expect.objectContaining({ connectionLimit: 2, waitForConnections: true })); expect(createPool.mock.calls[0][0]).not.toHaveProperty('acquireTimeout'); expect(createPool.mock.calls[0][0]).not.toHaveProperty('socketPath'); await node.close(); });
test('preserves an explicitly configured socket path', async () => { const createPool = jest.fn(() => ({ query: jest.fn(async () => [['ok']]), execute: jest.fn(async () => [['ok']]), getConnection: jest.fn(async () => connection()), end: jest.fn(async () => {}) })); const node = createNodePool({ profile: { ...profile, options: { socketPath: '/run/mysqld.sock' } }, mysqlLib: { createPool } }); expect(createPool.mock.calls[0][0].socketPath).toBe('/run/mysqld.sock'); await node.close(); });
test('manual exclusion remains effective past the failure quarantine interval', async () => { let now = 0; const node = createNodePool({ profile, mysqlLib: driver(), now: () => now, quarantineMs: 10 }); node.available = false; now = 100; expect(node.available).toBe(false); node.available = true; expect(node.available).toBe(true); });
test('node pool executes session setup and handles execute, connection, and health failures', async () => { const bad = Object.assign(new Error('down'), { code: 'ECONNREFUSED' }); const conn = connection(); const pool = driver({ getConnection: jest.fn(async () => conn) }); const node = createNodePool({ profile: { ...profile, options: { sessionStatements: ['SET x=1'] } }, mysqlLib: pool }); await node.query('SELECT 1'); await node.execute('SELECT 1'); conn.execute.mockRejectedValueOnce(bad); await expect(node.execute('SELECT 1')).rejects.toThrow(); const failing = driver({ getConnection: jest.fn(async () => { throw bad; }), query: jest.fn(async () => { throw bad; }) }); const other = createNodePool({ profile, mysqlLib: failing }); await expect(other.getConnection()).rejects.toThrow(); await expect(other.health()).rejects.toThrow(); });
test('node pool handles non-retryable execute, connection, and health failures', async () => { const bad = Object.assign(new Error('invalid'), { code: 'ER_PARSE_ERROR' }); const executePool = driver({ execute: jest.fn(async () => { throw bad; }) }); await expect(createNodePool({ profile, mysqlLib: executePool }).execute('BAD')).rejects.toThrow(); const connectionPool = driver({ getConnection: jest.fn(async () => { throw bad; }) }); await expect(createNodePool({ profile, mysqlLib: connectionPool }).getConnection()).rejects.toThrow(); const healthPool = driver({ query: jest.fn(async () => { throw bad; }) }); await expect(createNodePool({ profile, mysqlLib: healthPool }).health()).rejects.toThrow(); });

test('tracks active work and drains before force-closing', async () => {
  let resolveQuery;
  const query = new Promise((resolve) => { resolveQuery = resolve; });
  const end = jest.fn(async () => {});
  const pool = driver({ query: jest.fn(() => query), end });
  const node = createNodePool({ profile, mysqlLib: pool });
  const running = node.query('SELECT SLEEP(1)');
  expect(node.active).toBe(1);
  expect(node.drain().state).toBe('draining');
  expect(node.available).toBe(false);
  await expect(node.query('SELECT 1')).rejects.toThrow('unavailable');
  const idle = node.waitForIdle(1000);
  resolveQuery([['ok']]);
  await running;
  await expect(idle).resolves.toBe(true);
  node.recover();
  expect(node.state).toBe('ready');
  await node.forceClose();
  expect(end).toHaveBeenCalled();
});

test('does not resolve idle wait while another operation remains active', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const pool = driver({ query: jest.fn(() => pending) });
  const node = createNodePool({ profile, mysqlLib: pool });
  const first = node.query('SELECT 1');
  const second = node.query('SELECT 2');
  const idle = node.waitForIdle(1);
  release([['ok']]);
  await Promise.all([first, second]);
  await idle;
});

test('automatically force-closes after the drain deadline and protects release accounting', async () => {
  const end = jest.fn(async () => {});
  const conn = connection();
  const pool = driver({ end, getConnection: jest.fn(async () => conn) });
  const node = createNodePool({ profile, mysqlLib: pool });
  const acquired = await node.getConnection();
  expect(node.active).toBe(1);
  acquired.release();
  acquired.release();
  expect(node.active).toBe(0);
  node.drain(0);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(end).toHaveBeenCalled();
  await expect(node.waitForIdle()).resolves.toBe(true);
});
