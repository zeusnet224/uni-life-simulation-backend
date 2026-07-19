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

// Tests that societyList returns the correct error when given invalid inputs.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
describe('return errors for societyList', () => {
  test('return invalid student id', () => {
    const res = request('GET', SERVER_URL + '/society/list', { qs: { studentId: 'z1234567', simulationId: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid simulation ID', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const res = request('GET', SERVER_URL + '/society/list', { qs: { studentId, simulationId: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });
});

// Tests that societyList returns only societies the student has NOT already joined.
describe('POST /society/list', () => {
  test('return available societies', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create', {
      json: { studentId, universe: customUniverse },
      timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    request('POST', SERVER_URL + `/society/${simulationId}/CSESOC/join`, { json: { studentId }, timeout: TIMEOUT_MS });
    const res = request('GET', SERVER_URL + '/society/list', { qs: { studentId, simulationId }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      societies: [
        {
          societyId: 'CSESOC',
          name: 'Computer Science Society',
          description: 'Society for CSE',
        },
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
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY
describe('POST /society/join', () => {
  test('return invalid student id', () => {
    const res = request('POST', SERVER_URL + '/society/join', {
      json: { studentId: 'z1234567', simulationId: 1, societyId: 'CSESOC' },
      timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid simulation ID', () => {
    const res = request('POST', SERVER_URL + '/society/join', {
      json: { studentId: 'z1234567', simulationId: 67, societyId: 'CSESOC' },
      timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid society ID that does not exist', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create', {
      json: { studentId, universe: customUniverse },
      timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    const res = request('POST', SERVER_URL + '/society/join', {
      json: { studentId, simulationId, societyId: 'FAKESOC' },
      timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid society ID that student has already joined', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create', {
      json: { studentId, universe: customUniverse },
      timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    request('POST', SERVER_URL + '/society/join', { json: { studentId, simulationId, societyId: 'CSESOC' }, timeout: TIMEOUT_MS });
    const res = request('POST', SERVER_URL + '/society/join', { json: { studentId, simulationId, societyId: 'CSESOC' }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  // Tests that societyJoin returns the societyId and name on a successful join.
  test('return valid societyJoin', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    const res = request('POST', SERVER_URL + '/society/join', { json: { studentId, simulationId, societyId: 'CSESOC' }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      societyId: 'CSESOC',
      name: 'Computer Science Society',
    });
  });
});

// Tests that societyAttend returns the correct error when given invalid inputs.
// Student must have joined the society before attending.
// Duration must be between 1 and 4 hours inclusive.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY, INVALID_DURATION
describe('POST /society/attend', () => {
  test('return invalid student id', () => {
    const res = request('POST', SERVER_URL + '/society/attend',
      { json: { studentId: 'z1234567', simulationId: 1, societyId: 'CSESOC', duration: 1 },
        timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid simulation ID', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const res = request('POST', SERVER_URL + '/society/attend',
      { json: { studentId, simulationId: 67, societyId: 'CSESOC', duration: 1 },
        timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid society ID that does not exist', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create',
      { json: { studentId, universe: customUniverse },
        timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    const res = request('POST', SERVER_URL + '/society/attend',
      { json: { studentId, simulationId, societyId: 'FAKESOC', duration: 1 },
        timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('return invalid society ID that student has not joined', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create',
      { json: { studentId, universe: customUniverse },
        timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    const res = request('POST', SERVER_URL + '/society/attend',
      { json: { studentId, simulationId, societyId: 'CSESOC', duration: 1 },
        timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test.each([{ duration: 0 }, { duration: 5 }])('return invalid duration $duration', ({ duration }) => {
    const registerRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    request('POST', SERVER_URL + '/society/join', { json: { studentId, simulationId, societyId: 'CSESOC' }, timeout: TIMEOUT_MS });
    const res = request('POST', SERVER_URL + '/society/attend', { json: { studentId, simulationId, societyId: 'CSESOC', duration }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  // Tests that societyAttend correctly updates happiness and energy after attending.
  // Attending costs 5 energy per hour and gains 10 happiness per hour.
  test('return valid attendance of a society', () => {
    const registerRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(registerRes.body.toString());
    const simulationRes = request('POST', SERVER_URL + '/simulation/create',
      { json: { studentId, universe: customUniverse },
        timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simulationRes.body.toString());
    request('POST', SERVER_URL + '/society/join',
      { json: { studentId, simulationId, societyId: 'CSESOC' },
        timeout: TIMEOUT_MS });
    const res = request('POST', SERVER_URL + '/society/attend',
      { json: { studentId, simulationId, societyId: 'CSESOC', duration: 3 },
        timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      happiness: 80,
      energy: 85,
    });
  });
});
