// Do not delete this file before iteration 3
import { describe, expect, test } from 'vitest';
import { echo } from './echo';

describe('echo', () => {
  test('returns the provided value', () => {
    expect(echo('1')).toBe('1');
    expect(echo('abc')).toBe('abc');
  });

  test('returns an error for an invalid echo object', () => {
    const res = echo({ echo: 'echo' });

    expect(res).toStrictEqual({ error: 'INVALID_ECHO', message: expect.any(String) });
  });
});
