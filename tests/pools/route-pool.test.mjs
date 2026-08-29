import { expect, test, jest } from '@jest/globals';
import { createRoutePool } from '../../src/pools/route-pool.mjs';

test('route pool selects available weighted nodes and reports health failures', async () => {
  const calls = [];
  const node = (host, weight, available = true) => ({ host, port: 3306, weight, available, query: async () => calls.push(host), execute: async () => calls.push(host), health: async () => { if (host === 'bad') throw new Error('down'); return { ok: true, host }; }, close: async () => {} });
  const pool = createRoutePool([node('a', 0), node('bad', 0)]);
  await pool.query('SELECT 1');
  await pool.execute('UPDATE x');
  expect(calls).toHaveLength(2);
  expect(pool.choose()).toBeTruthy();
  expect(() => { pool.setAvailability('a', false); pool.setAvailability('bad', false); pool.choose(); }).toThrow('no eligible');
  expect((await pool.health()).find((value) => value.ok === false).host).toBe('bad');
  await pool.close();
});

test('walks past a weighted node before selecting the next node', () => {
  const node = (host) => ({ host, weight: 1, available: true });
  const pool = createRoutePool([node('first'), node('second')]);
  expect(pool.choose().host).toBe('first');
  expect(pool.choose().host).toBe('second');
});

test('prefers the elected writer and fails over in bundle order', () => {
  const node = (host, available = true) => ({ host, weight: 0, available });
  const pool = createRoutePool([node('writer'), node('backup-a'), node('backup-b')], { preferred: true });
  expect(pool.choose().host).toBe('writer');
  pool.setAvailability('writer', false);
  expect(pool.choose().host).toBe('backup-a');
  pool.setAvailability('backup-a', false);
  expect(pool.choose().host).toBe('backup-b');
});

test('route lifecycle helpers tolerate simple nodes', async () => {
  const nodes = [{ host: 'simple', weight: 1, available: true, query: jest.fn(), execute: jest.fn(), close: jest.fn(async () => {}) }];
  const pool = createRoutePool(nodes);
  expect(pool.drain('missing')).toEqual([]);
  expect(pool.recover('missing')).toEqual([]);
  await expect(pool.waitForIdle(0)).resolves.toEqual([true]);
  await pool.forceClose('simple');
  expect(nodes[0].close).toHaveBeenCalled();
});
