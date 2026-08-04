import { describe, expect, test, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from './config.json' with { type: 'json' };

const { port, url } = config;
const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

const customUniverse = {
  courses: [
    { courseId: 'COMP1531', name: 'Software Engineering Fundamentals' },
  ],
  exams: [
    { examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'Quiz 1', requiredStudyHours: 2 },
  ],
};

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

function register(): string {
  const res = request('POST', SERVER_URL + '/auth/register', {
    json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(res.body.toString()).session;
}

function createSimulation(session: string): number {
  const res = request('POST', SERVER_URL + '/simulations', {
    headers: { session },
    json: { universeData: customUniverse },
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(res.body.toString()).simulationId;
}

function applyAction(session: string, simulationId: number, action: string, duration: number, examId?: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/action`, {
    headers: { session },
    json: { action, duration, examId },
    timeout: TIMEOUT_MS,
  });
}

function attemptExam(session: string, simulationId: number, examId: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/exams/${examId}/attempt`, {
    headers: { session },
    timeout: TIMEOUT_MS,
  });
}

describe('POST /simulations/:simulationId/exams/:examId/attempt errors', () => {
  test('returns 401 when no session provided', () => {
    const res = request('POST', SERVER_URL + '/simulations/1/exams/E1-COMP1531/attempt', { timeout: TIMEOUT_MS });
    expect(res.statusCode).toBe(401);
  });

  test('returns 403 INVALID_SIMULATION for a non-existent simulation', () => {
    const session = register();
    const res = attemptExam(session, 99999, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(403);
    expect(body.error).toBe('INVALID_SIMULATION');
  });

  test('returns 400 INVALID_EXAM for a non-existent exam', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = attemptExam(session, simulationId, 'FAKE-EXAM');
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body.error).toBe('INVALID_EXAM');
  });

  test('returns 400 ALREADY_ATTEMPTED on second attempt', () => {
    const session = register();
    const simulationId = createSimulation(session);
    attemptExam(session, simulationId, 'E1-COMP1531');
    const res = attemptExam(session, simulationId, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body.error).toBe('ALREADY_ATTEMPTED');
  });
});

describe('POST /simulations/:simulationId/exams/:examId/attempt success cases', () => {
  test('returns PASS when study hours meet the requirement', () => {
    const session = register();
    const simulationId = createSimulation(session);
    applyAction(session, simulationId, 'STUDYING', 2, 'E1-COMP1531');

    const res = attemptExam(session, simulationId, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(body.exam[0].examOutcome).toBe('PASS');
    expect(body.exam[0].examStatus).toBe('ATTEMPTED');
  });

  test('returns FAIL when study hours are below the requirement', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = attemptExam(session, simulationId, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(body.exam[0].examOutcome).toBe('FAIL');
  });

  test('costs 30 energy when attempting an exam', () => {
    const session = register();
    const simulationId = createSimulation(session);
    attemptExam(session, simulationId, 'E1-COMP1531');

    const statusRes = request('GET', SERVER_URL + `/simulations/${simulationId}`, {
      headers: { session },
      timeout: TIMEOUT_MS,
    });
    const statusBody = JSON.parse(statusRes.body.toString());
    expect(statusBody.energy).toBe(70);
  });
});
