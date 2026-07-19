// Tests for simulationCreate, simulationStatus and simulationsList in simulation.ts
// Covers: error validation, DROPPED_OUT conditions from energy/happiness/course/exam failures
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
      courseStatus: 'FAILED',
    }
  ]
};
const draindownUniverse = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
    }
  ],
  exams: [
    { examId: '1', courseId: 'COMP1531', name: 'Practice Exam', requiredStudyHours: 100 }
  ]
};

const customUniverse2 = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
    }
  ],
  exams: [
    { examId: '1', examOutcome: 'FAIL' },
    { examId: '2', examOutcome: 'FAIL' },
    { examId: '3', examOutcome: 'FAIL' },
    { examId: '4', examOutcome: 'FAIL' },
    { examId: '5', examOutcome: 'FAIL' }
  ]
};

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

// Registers a student and returns their session token.
function register(studentId = 'z1234567', password = 'ILoveComp1531'): string {
  const res = request('POST', SERVER_URL + '/auth/register',
    { json: { studentId, password, nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
  return JSON.parse(res.body.toString()).session;
}

// Creates a simulation for the given session and returns its simulationId.
function createSimulation(session: string, universeData: object): number {
  const res = request('POST', SERVER_URL + '/simulations', {
    headers: { session },
    json: { universeData },
    timeout: TIMEOUT_MS
  });
  return JSON.parse(res.body.toString()).simulationId;
}

// Applies an action to a simulation for the given session.
function applyAction(session: string, simulationId: number, action: string, duration: number, examId?: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/action`, {
    headers: { session },
    json: { action, duration, examId },
    timeout: TIMEOUT_MS
  });
}

// Tests that simulationStatus returns the correct error when given invalid inputs.
// Errors: UNAUTHORISED, INVALID_SIMULATION
describe('simulationStatus return errors', () => {
  test('return unauthorised when no session provided', () => {
    const res = request('GET', SERVER_URL + '/simulations/1', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
  });

  test('return invalid simulation id', () => {
    const session = register();
    const res = request('GET', SERVER_URL + '/simulations/50000', { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid simulation when simulation belongs to another student', () => {
    const session1 = register('z1234567', 'ILoveComp1531');
    const session2 = register('z7654321', 'Pikachu123');
    const simulationId = createSimulation(session1, customUniverse);
    const res = request('GET', SERVER_URL + `/simulations/${simulationId}`, { headers: { session: session2 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });
});

// Tests that simulationStatus correctly sets simulationStatus to DROPPED_OUT
// when any of these conditions are met:
// - energy reaches 0
// - happiness reaches 0
// - any course has FAILED status
// - 5 or more total exam failures
describe('simulationStatus returns DROPPED_OUT', () => {
  test('Energy reaches 0 points', () => {
    const session = register();
    const simulationId = createSimulation(session, draindownUniverse);

    for (let i = 0; i < 9; i++) {
      applyAction(session, simulationId, 'STUDYING', 3, '1');
      applyAction(session, simulationId, 'DOOM_SCROLLING', 1, '1');
    }

    const res = request('GET', SERVER_URL + `/simulations/${simulationId}`, { headers: { session }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: 0,
      happiness: body.happiness,
      timeElapsed: body.timeElapsed
    });
  });

  test('Happiness reaches 0 points', () => {
    const session = register();
    const simulationId = createSimulation(session, draindownUniverse);

    for (let i = 0; i < 5; i++) {
      applyAction(session, simulationId, 'STUDYING', 3, '1');
      applyAction(session, simulationId, 'SLEEPING', 3, '1');
    }

    const res = request('GET', SERVER_URL + `/simulations/${simulationId}`, { headers: { session }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: body.energy,
      happiness: 0,
      timeElapsed: body.timeElapsed
    });
  });

  test('Course receives FAILED status', () => {
    const session = register();
    const simulationId = createSimulation(session, customUniverse);

    const res = request('GET', SERVER_URL + `/simulations/${simulationId}`, { headers: { session }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: body.energy,
      happiness: body.happiness,
      timeElapsed: body.timeElapsed
    });
  });

  test('5 total exams failed', () => {
    const session = register();
    const simulationId = createSimulation(session, customUniverse2);

    const res = request('GET', SERVER_URL + `/simulations/${simulationId}`, { headers: { session }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: body.energy,
      happiness: body.happiness,
      timeElapsed: body.timeElapsed
    });
  });
});