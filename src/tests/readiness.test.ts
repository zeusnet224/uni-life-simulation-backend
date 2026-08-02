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
    { examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'Quiz 1', requiredStudyHours: 4 },
  ],
  opportunities: [
    {
      opportunityId: 'peer-mentoring',
      name: 'Peer Mentoring Program',
      description: 'Weekly mentoring sessions',
      happinessBonus: 5,
      academicBonus: 1,
      weeklyHours: 1,
    },
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

function joinOpportunity(session: string, simulationId: number, opportunityId: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/opportunities/${opportunityId}/join`, {
    headers: { session },
    timeout: TIMEOUT_MS,
  });
}

function getReadiness(session: string, simulationId: number, examId: string) {
  return request('GET', SERVER_URL + `/simulations/${simulationId}/exams/${examId}/readiness`, {
    headers: { session },
    timeout: TIMEOUT_MS,
  });
}

describe('GET /simulations/:simulationId/exams/:examId/readiness errors', () => {
  test('returns 401 when no session provided', () => {
    const res = request('GET', SERVER_URL + '/simulations/1/exams/E1-COMP1531/readiness', { timeout: TIMEOUT_MS });
    expect(res.statusCode).toBe(401);
  });

  test('returns 400 INVALID_SIMULATION for a non-existent simulation', () => {
    const session = register();
    const res = getReadiness(session, 99999, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body.error).toBe('INVALID_SIMULATION');
  });

  test('returns 400 INVALID_EXAM for a non-existent exam', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = getReadiness(session, simulationId, 'FAKE-EXAM');
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(400);
    expect(body.error).toBe('INVALID_EXAM');
  });
});

describe('GET /simulations/:simulationId/exams/:examId/readiness success cases', () => {
  test('returns LOW readiness for a fresh simulation with no study progress, no opportunities', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = getReadiness(session, simulationId, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(body.examId).toBe('E1-COMP1531');
    expect(body.readiness).toBe('LOW');
    expect(Array.isArray(body.reasons)).toBe(true);
    expect(body.reasons.length).toBeGreaterThanOrEqual(3);
  });

test('returns MEDIUM readiness when 2 of 3 factors are met', () => {
  const session = register();
  const simulationId = createSimulation(session);

  // Study 3 hours (meets 75% of 4 required hours), then eat to recover
  // happiness back to the 50 wellbeing threshold (still no opportunity joined)
  applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');
  applyAction(session, simulationId, 'EATING', 5);

  const res = getReadiness(session, simulationId, 'E1-COMP1531');
  const body = JSON.parse(res.body.toString());

  expect(res.statusCode).toBe(200);
  expect(body.readiness).toBe('MEDIUM');
});

test('returns HIGH readiness when all 3 factors are met', () => {
  const session = register();
  const simulationId = createSimulation(session);

  applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');
  applyAction(session, simulationId, 'EATING', 5);
  joinOpportunity(session, simulationId, 'peer-mentoring');

  const res = getReadiness(session, simulationId, 'E1-COMP1531');
  const body = JSON.parse(res.body.toString());

  expect(res.statusCode).toBe(200);
  expect(body.readiness).toBe('HIGH');
});

  test('reasons array explains each factor', () => {
    const session = register();
    const simulationId = createSimulation(session);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');

    const res = getReadiness(session, simulationId, 'E1-COMP1531');
    const body = JSON.parse(res.body.toString());

    const combinedReasons = body.reasons.join(' ');
    expect(combinedReasons).toContain('study hours');
    expect(combinedReasons.toLowerCase()).toContain('wellbeing');
    expect(combinedReasons.toLowerCase()).toContain('opportunit');
  });
});
