// Tests for authRegister and authLogin in auth.js
// Covers: valid registration, all invalid input cases, valid login, and invalid credentials
import { authRegister, authLogin } from '../auth.js';
import { clearData } from '../dataStore.js';
import { describe, test, expect, beforeEach } from 'vitest';

beforeEach(() => {
  clearData();
});

// Tests that authRegister correctly validates all inputs and registers a new student.
// studentId must be lowercase z + 7 digits, names 2-20 chars, password 8+ chars with letter and number.
// Errors: INVALID_STUDENT_ID, INVALID_FIRST_NAME, INVALID_LAST_NAME, INVALID_PASSWORD
describe('authRegister', () => {
  test('valid registration returns studentId', () => {
    const result = authRegister('z5712149', 'abc123!!', 'Saniya', 'Khan');
    expect(result).toStrictEqual({ studentId: 'z5712149' });
  });

  test('invalid studentId format returns error', () => {
    const result = authRegister('invalid', 'abc123!!', 'Saniya', 'Khan');
    expect(result).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('duplicate studentId returns error', () => {
    authRegister('z5712149', 'abc123!!', 'Saniya', 'Khan');
    const result = authRegister('z5712149', 'abc123!!', 'Saniya', 'Khan');
    expect(result).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('invalid first name returns error', () => {
    const result = authRegister('z5712149', 'abc123!!', 'S', 'Khan');
    expect(result).toStrictEqual({ error: 'INVALID_FIRST_NAME', message: expect.any(String) });
  });

  test('invalid last name returns error', () => {
    const result = authRegister('z5712149', 'abc123!!', 'Saniya', 'K');
    expect(result).toStrictEqual({ error: 'INVALID_LAST_NAME', message: expect.any(String) });
  });

  test('invalid password returns error', () => {
    const result = authRegister('z5712149', 'short', 'Saniya', 'Khan');
    expect(result).toStrictEqual({ error: 'INVALID_PASSWORD', message: expect.any(String) });
  });
});

// Tests that authLogin correctly validates credentials and returns the studentId.
// Both studentId and password must match exactly.
// Errors: INVALID_CREDENTIALS
describe('authLogin', () => {
  test('valid login returns studentId', () => {
    authRegister('z5712149', 'abc123!!', 'Saniya', 'Khan');
    const result = authLogin('z5712149', 'abc123!!');
    expect(result).toStrictEqual({ studentId: 'z5712149' });
  });

  test('wrong studentId returns error', () => {
    const result = authLogin('z9999999', 'abc123!!');
    expect(result).toStrictEqual({ error: 'INVALID_CREDENTIALS', message: expect.any(String) });
  });

  test('wrong password returns error', () => {
    authRegister('z5712149', 'abc123!!', 'Saniya', 'Khan');
    const result = authLogin('z5712149', 'wrongpassword1');
    expect(result).toStrictEqual({ error: 'INVALID_CREDENTIALS', message: expect.any(String) });
  });
});