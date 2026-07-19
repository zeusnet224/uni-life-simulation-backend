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
      courseDetails: 'COMP1531 course details',
      courseStatus: 'FAILED',
    }
  ],
  exams: [
    {
      examId: 'E1-COMP1531',
      courseId: 'COMP1531',
      name: 'Exam 1 For COMP1531',
      requiredStudyHours: 1,
    }
  ]
};

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

function register() {
  const res = request('POST', SERVER_URL + '/auth/register',
    { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
  return JSON.parse(res.body.toString()).studentId;
}

function createSimulation(studentId: string) {
  const res = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
  return JSON.parse(res.body.toString()).simulationId;
}

describe('GET /simulations/:simulationId/courses', () => {
  test('return invalid simulation error', () => {
    const res = request('GET', SERVER_URL + '/simulations/5000/courses', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return valid courses', () => {
    const studentId = register();
    const simulationId = createSimulation(studentId);
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/courses`, { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      courses: [
        {
          courseId: 'COMP1531',
          name: 'Software Engineering Fundamentals'
        }
      ]
    });
  });
});

describe('GET /simulations/:simulationId/exams', () => {
  test('return invalid simulation error', () => {
    const studentId = register();
    createSimulation(studentId);
    const res = request('GET', SERVER_URL + '/simulations/5000/exams', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return valid exams', () => {
    const studentId = register();
    const simulationId = createSimulation(studentId);
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/exams`, { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      exams: [
        {
          examId: 'E1-COMP1531',
          courseId: 'COMP1531',
          name: 'Exam 1 For COMP1531',
          requiredStudyHours: 1
        }
      ]
    });
  });
});

describe('GET /simulations/:simulationId/courses/:courseId', () => {
  test('return invalid stimulation error', () => {
    const res = request('GET', SERVER_URL + '/simulations/67/courses/COMP1531', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid course error', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register', { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' }, timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/courses/MATH1081`, { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_COURSE', message: expect.any(String) });
  });

  test('return valid course details', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/courses/COMP1531`, { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      course: [
        {
          courseId: 'COMP1531',
          name: 'Software Engineering Fundamentals',
          courseDetails: 'COMP1531 course details',
          courseStatus: 'FAILED'
        }
      ]
    });
  });
});

describe('GET /simulations/:simulationId/exams/:examId', () => {
  test('return invalid stimulation error', () => {
    const res = request('GET', SERVER_URL + '/simulations/1/exams/E1-COMP1531', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid exam error', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/exams/TROLLEXAM`, { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_EXAM', message: expect.any(String) });
  });

  test('return valid exam details', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}/exams/E1-COMP1531`, { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      exam: [
        {
          examId: 'E1-COMP1531',
          courseId: 'COMP1531',
          name: 'Exam 1 For COMP1531',
          requiredStudyHours: 1
        }
      ]
    });
  });
});

describe('courseCompletion', () => {
  test('return invalid student id error', () => {
    const res = request('POST', SERVER_URL + '/simulations/1/courses/COMP1531/complete', { json: { studentId: 'z1111111' }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('return invalid stimulation error', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register', { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' }, timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const res = request('POST', SERVER_URL + '/simulations/67/courses/COMP1531/complete', { json: { studentId }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid course error', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register', { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' }, timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/courses/MATH1081/complete`, { json: { studentId }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_COURSE', message: expect.any(String) });
  });

  test('return course completion', () => {
    const regRes = request('POST', SERVER_URL + '/auth/register', { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' }, timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(regRes.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('POST', SERVER_URL + `/simulations/${simulationId}/courses/COMP1531/complete`, { json: { studentId }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      course: [
        {
          courseId: 'COMP1531',
          courseStatus: 'FAILED'
        }
      ]
    });
  });
});
