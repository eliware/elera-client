import { expect, test } from '@jest/globals';
import { classifyQuery, routeFor } from '../src/routing.mjs';

test('routes safe single statement reads to balanced', () => {
  expect(classifyQuery('SELECT 1')).toBe('balanced');
  expect(classifyQuery('/* note */ SHOW STATUS')).toBe('balanced');
});

test('keeps unsafe and ambiguous statements on primary', () => {
  expect(classifyQuery('UPDATE t SET x = 1')).toBe('primary');
  expect(classifyQuery('SELECT 1; SELECT 2')).toBe('primary');
  expect(classifyQuery('SELECT * FROM t FOR UPDATE')).toBe('primary');
});

test('supports explicit routes and rejects unknown routes', () => {
  expect(routeFor('UPDATE t SET x = 1', 'balanced')).toBe('balanced');
  expect(() => routeFor('SELECT 1', 'unknown')).toThrow();
});

test('defaults automatic and non-string inputs to primary when appropriate', () => {
  expect(routeFor('SELECT 1')).toBe('balanced');
  expect(classifyQuery(null)).toBe('primary');
});
