import { expect, test } from '@jest/globals';
import { asSqlError, classifyError, SqlClientError } from '../src/errors.mjs';

test('classifies retryable and non-retryable SQL failures', () => {
  expect(classifyError({ code: 'ECONNRESET' }).retryable).toBe(true);
  expect(classifyError({ code: 'ER_ACCESS_DENIED_ERROR' }).retryable).toBe(false);
});

test('wraps errors without double wrapping', () => {
  const original = new Error('failed');
  const wrapped = asSqlError(original);
  expect(wrapped).toBeInstanceOf(SqlClientError);
  expect(asSqlError(wrapped)).toBe(wrapped);
});
