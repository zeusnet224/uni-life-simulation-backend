import { describe, expect, test, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from './config.json' with { type: 'json' };

const { port, url } = config;
const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

const customUniverse = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
    }
  ],
  societies: [
    { societyId: 'CSESOC',
      name: 'Computer Science Society',
      description: 'Society for CSE'
    },
    { societyId: 'BITSA',
      name: 'Business Information Technology Society',
      description: 'Society for Information Systems and Technologies'
    },
    { societyId: 'CATSOC',
      name: 'CATSOC UNSW',
      description: 'UNSWs Official Cat Society'
    },
  ]
};

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

// Registers a student and returns their session token.
function register(): string {
  const res = request('POST', SERVER_URL + '/auth/register', {
    json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
    timeout: TIMEOUT_MS });
  return JSON.parse(res.body.toString()).session;
}

// Creates a simulation for the given session and returns its simulationId.
function createSimulation(session: string): number {
  const res = request('POST', SERVER_URL + '/simulations', {
    headers: { session },
    json: { universeData: customUniverse },
    timeout: TIMEOUT_MS });
  return JSON.parse(res.body.toString()).simulationId;
}

// Tests that GET societies returns the correct error when given invalid inputs.
// Errors: UNAUTHORISED, INVALID_SIMULATION
describe('GET /simulations/:simulationId/societies errors', () => {
  test('return unauthorised when no session provided', () => {
    const res = request('GET', SERVER_URL + '/simulations/1/societies', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('return invalid simulation ID', () => {
    const session = register();
    const res = request('GET', SERVER_URL + '/simulations/1/societies', { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(403);
  });
});

// Tests that GET societies returns only societies the student has NOT already joined.
describe('GET /simulations/:simulationId/societies', () => {
  test('return available societies', () => {
    const session = register();
    const simulationId = createSimulation(session);
    request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/societies`, { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      societies: [
        {
          societyId: 'BITSA',
          name: 'Business Information Technology Society',
          description: 'Society for Information Systems and Technologies',
        },
        {
          societyId: 'CATSOC',
          name: 'CATSOC UNSW',
          description: 'UNSWs Official Cat Society',
        },
      ],
    });
  });
});

// Tests that societyJoin returns the correct error when given invalid inputs.
// A student cannot join a society they have already joined.
// Errors: UNAUTHORISED, INVALID_SIMULATION, INVALID_SOCIETY
describe('POST /simulations/:simulationId/societies/:societyId/join', () => {
  test('return unauthorised when no session provided', () => {
    const res = request('POST', SERVER_URL + '/simulations/1/societies/CSESOC/join', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('return invalid simulation ID', () => {
    const session = register();
    const res = request('POST', SERVER_URL + '/simulations/67/societies/CSESOC/join', { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('return invalid society ID that does not exist', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/FAKESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid society ID that student has already joined', () => {
    const session = register();
    const simulationId = createSimulation(session);
    request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  // Tests that societyJoin returns the societyId and name on a successful join.
  test('return valid societyJoin', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      societyId: 'CSESOC',
      name: 'Computer Science Society',
    });
  });
});

// Tests that societyAttend returns the correct error when given invalid inputs.
// Student must have joined the society before attending.
// Duration must be between 1 and 4 hours inclusive.
// Errors: UNAUTHORISED, INVALID_SIMULATION, INVALID_SOCIETY, INVALID_DURATION
describe('POST /simulations/:simulationId/societies/:societyId/attend', () => {
  test('return unauthorised when no session provided', () => {
    const res = request('POST', SERVER_URL + '/simulations/1/societies/CSESOC/attend',
      { json: { duration: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('return invalid simulation ID', () => {
    const session = register();
    const res = request('POST', SERVER_URL + '/simulations/67/societies/CSESOC/attend',
      { headers: { session }, json: { duration: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('return invalid society ID that does not exist', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/FAKESOC/attend`,
      { headers: { session }, json: { duration: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid society ID that student has not joined', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/attend`,
      { headers: { session }, json: { duration: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test.each([{ duration: 0 }, { duration: 5 }])('return invalid duration $duration', ({ duration }) => {
    const session = register();
    const simulationId = createSimulation(session);
    request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/attend`,
      { headers: { session }, json: { duration }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  // Tests that societyAttend correctly updates happiness and energy after attending.
  // Attending costs 5 energy per hour and gains 10 happiness per hour.
  test('return valid attendance of a society', () => {
    const session = register();
    const simulationId = createSimulation(session);
    request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/join`, { headers: { session }, timeout: TIMEOUT_MS });
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/societies/CSESOC/attend`,
      { headers: { session }, json: { duration: 3 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      happiness: 80,
      energy: 85,
    });
  });
});
