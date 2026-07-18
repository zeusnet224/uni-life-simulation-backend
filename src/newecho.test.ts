// Do not delete this file
import { describe, expect, test } from 'vitest';
import { echo } from './newecho';

describe('echo', () => {
  test('returns the provided value', () => {
    expect(echo('Hello')).toStrictEqual({ value: 'Hello' });
  });

  test('returns an error for an invalid echo value', () => {
    expect(echo('echo')).toStrictEqual({ error: 'INVALID_ECHO', message: expect.any(String) });
  });
});
