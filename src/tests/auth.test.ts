// HTTP tests for POST /auth/register and POST /auth/login
// Sends real requests to the running server and checks status codes + response bodies
// DELETE /clear resets state before each test
import {describe, test, expect, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from '../config.json' with { type: 'json'};

const SERVER_URL = `${config.url}:${config.port}`;

beforeEach(() => {
  request('DELETE', `${SERVER_URL}/clear`);
});


describe('POST /auth/register', () => {
  test('valid registration returns a session', () => {
    const res = request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(200);
    expect(body).toStrictEqual({ session: expect.any(String) });
  });

  test('invalid studentId format returns error', () => {
    const res = request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'invalid',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
      }
    });

    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('duplicate studentId returns error', () => {
    // first request registers the student successfully; second request re-uses
    // the same studentId and should be rejected as already taken
    request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
    } });

    const res = request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',

    } });

    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('invalid nameFirst returns error', () => {
    const res = request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'S',
        nameLast: 'Khan',
      } });

      const body = JSON.parse(res.body.toString());
      expect(res.statusCode).toBe(400);
      expect(body).toStrictEqual({ error: 'INVALID_FIRST_NAME', message: expect.any(String)});
  });

  test('invalid nameLast return error', () => {
    const res = request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'K',
      } });

      const body = JSON.parse(res.body.toString());
      expect(res.statusCode).toBe(400);
      expect(body).toStrictEqual({ error: 'INVALID_LAST_NAME', message: expect.any(String)});
  });

  test('invalid password return error', () => {
    const res = request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'short',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
      } });

      const body = JSON.parse(res.body.toString());
      expect(res.statusCode).toBe(400);
      expect(body).toStrictEqual({ error: 'INVALID_PASSWORD', message: expect.any(String)});
  });
});


describe ('POST /auth/login', () => {
  // register a student first so there's a real account to log in against.
  test('valid login returns a session', () => {
    request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
      }
    });

    const res = request('POST', `${SERVER_URL}/auth/login`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(200);
    expect(body).toStrictEqual({ session: expect.any(String) });
  });


  test('invalid studentId returns error', () => {
    const res = request('POST', `${SERVER_URL}/auth/login`, {
      json: {
        studentId: 'invalid',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({error: 'INVALID_CREDENTIALS', message: expect.any(String)});
  });

   test('invalid password returns error', () => {
    request('POST', `${SERVER_URL}/auth/register`, {
      json: {
        studentId: 'z5712149',
        password: 'abc123!!',
        nameFirst: 'Saniya',
        nameLast: 'Khan',
      }
    });
    const res = request('POST', `${SERVER_URL}/auth/login`, {
      json: {
        studentId: 'z5712149',
        password: 'wrongPassword',
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({error: 'INVALID_CREDENTIALS', message: expect.any(String)});
  });
});
