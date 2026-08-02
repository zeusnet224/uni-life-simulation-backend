import { describe, test, expect, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from '../config.json' with { type: 'json' };

const SERVER_URL = `${config.url}:${config.port}`;

let session: string;
let simulationId: number;

beforeEach(() => {
  request('DELETE', `${SERVER_URL}/clear`);

  const registerRes = request('POST', `${SERVER_URL}/auth/register`, {
    json: {
      studentId: 'z5712149',
      password: 'abc123!!',
      nameFirst: 'Saniya',
      nameLast: 'Khan',
    }
  });
  session = JSON.parse(registerRes.body.toString()).session;

  const simRes = request('POST', `${SERVER_URL}/simulations`, {
    headers: { session },
    json: {
      universeData: {
        courses: [],
        exams: [],
      }
    }
  });
  simulationId = JSON.parse(simRes.body.toString()).simulationId;
});

describe('POST /simulations/:simulationId/connections', () => {
  test('valid creation returns a connectionId', () => {
    const res = request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: 'Jamie Park',
        closeness: 3,
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(200);
    expect(body).toStrictEqual({ connectionId: expect.any(String) });
  });

  test('invalid name returns error', () => {
    const res = request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: ' ',
        closeness: 3,
      }

    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({ error: 'INVALID_NAME', message: expect.any(String) });
  });

  test('invalid closesness returns error', () => {
    const res = request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: 'Jamie Park',
        closeness: 10,
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({ error: 'INVALID_CLOSENESS', message: expect.any(String) });
  });

  test('duplicate connection returns error', () => {
    request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: 'Jamie Park',
        closeness: 3,
      }
    });

    const res = request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: 'Jamie Park',
        closeness: 4,
      }
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body).toStrictEqual({ error: 'DUPLICATE_CONNECTION', message: expect.any(String) });
  });
});

describe('GET /simulations/:simulationId/connections', () => {
  test('lists created connections', () => {
    request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: 'Jamie Park',
        closeness: 3,
      }
    });

    const res = request('GET', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(200);
    expect(body.connections).toHaveLength(1);
    expect(body.connections[0]).toMatchObject({
      name: 'Jamie Park',
      closeness: 3,
    });
  });
});

describe('DELETE /simulations/:simulationId/connections/:connectionId', () => {
  test('removes a connection successfully', () => {
    const createRes = request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`, {
      headers: { session },
      json: {
        name: 'Jamie Park',
        closeness: 3,
      }
    });
    const { connectionId } = JSON.parse(createRes.body.toString());

    const res = request('DELETE', `${SERVER_URL}/simulations/${simulationId}/connections/${connectionId}`, {
      headers: { session },
    });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(200);
    expect(body).toStrictEqual({});
  });
});
