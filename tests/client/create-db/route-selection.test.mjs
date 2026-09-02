import { expect, test } from '@jest/globals';
import { createRouteSelection } from '../../../src/client/create-db/route-selection.mjs';

const primary = { name: 'primary' };
const balanced = { name: 'balanced' };

test('selects primary by default and balanced for safe reads', () => {
  const selection = createRouteSelection({ primaryPool: primary, balancedPool: balanced, routing: 'auto' });
  expect(selection.choose('UPDATE items SET value = 1')).toBe(primary);
  expect(selection.choose('SELECT * FROM items')).toBe(balanced);
  expect(selection.requestedRoute('SELECT 1')).toBe('balanced');
});

test('honors explicit routes and explicit connections', () => {
  const connection = { name: 'connection' };
  const selection = createRouteSelection({ primaryPool: primary, balancedPool: balanced, routing: 'primary' });
  expect(selection.choose('SELECT 1')).toBe(primary);
  expect(selection.choose('SELECT 1', { route: 'balanced' })).toBe(balanced);
  expect(selection.choose('SELECT 1', { connection, route: 'balanced' })).toBe(connection);
  expect(selection.requestedRoute('UPDATE items SET value = 1', { route: 'balanced' })).toBe('balanced');
});

test('falls back to the primary pool when no balanced pool exists', () => {
  const selection = createRouteSelection({ primaryPool: primary, balancedPool: null, routing: 'auto' });
  expect(selection.choose('SELECT 1')).toBe(primary);
  expect(selection.isSafeBalancedRetry('SELECT 1', { route: 'balanced' }, { retryable: true })).toBe(false);
});

test('only allows retryable balanced classified reads to retry', () => {
  const selection = createRouteSelection({ primaryPool: primary, balancedPool: balanced, routing: 'auto' });
  expect(selection.isSafeBalancedRetry('SELECT 1', undefined, { retryable: true })).toBe(true);
  expect(selection.isSafeBalancedRetry('SELECT 1', { route: 'primary' }, { retryable: true })).toBe(false);
  expect(selection.isSafeBalancedRetry('UPDATE items SET value = 1', { route: 'balanced' }, { retryable: true })).toBe(false);
  expect(selection.isSafeBalancedRetry('SELECT 1', { route: 'balanced' }, { retryable: false })).toBe(false);
});
