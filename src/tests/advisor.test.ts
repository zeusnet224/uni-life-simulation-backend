import { describe, expect, test, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from '../config.json' with { type: 'json' };

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

function getPlan(session: string, simulationId: number) {
  return request('GET', SERVER_URL + `/simulations/${simulationId}/advisor/plan`, {
    headers: { session },
    timeout: TIMEOUT_MS,
  });
}

describe('GET /simulations/:simulationId/advisor/plan errors', () => {
  test('returns 401 UNAUTHORISED when no session provided', () => {
    const res = request('GET', SERVER_URL + '/simulations/1/advisor/plan', { timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(401);
    expect(body.error).toBe('UNAUTHORISED');
  });

  test('returns 403 INVALID_SIMULATION for a non-existent simulation', () => {
    const session = register();
    const res = getPlan(session, 99999);
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(403);
    expect(body.error).toBe('INVALID_SIMULATION');
  });

  test('returns 403 INVALID_SIMULATION for a simulation belonging to another student', () => {
    const session1 = register();
    const simulationId = createSimulation(session1);

    const res2 = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z7654321', password: 'AnotherPass1', nameFirst: 'Jane', nameLast: 'Doe' },
      timeout: TIMEOUT_MS,
    });
    const session2 = JSON.parse(res2.body.toString()).session;

    const res = getPlan(session2, simulationId);
    const body = JSON.parse(res.body.toString());
    expect(res.statusCode).toBe(403);
    expect(body.error).toBe('INVALID_SIMULATION');
  });
});

describe('GET /simulations/:simulationId/advisor/plan success cases', () => {
  test('returns at least 3 options and at least 1 blocker', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(body.options)).toBe(true);
    expect(body.options.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(body.blockers)).toBe(true);
    expect(body.blockers.length).toBeGreaterThanOrEqual(1);
  });

  test('each option includes action, allowed, impact, and reason', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    for (const option of body.options) {
      expect(option).toHaveProperty('action');
      expect(option).toHaveProperty('allowed');
      expect(option).toHaveProperty('impact');
      expect(option).toHaveProperty('reason');
      expect(typeof option.allowed).toBe('boolean');
    }
  });

  test('each blocker includes type and description', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    for (const blocker of body.blockers) {
      expect(blocker).toHaveProperty('type');
      expect(blocker).toHaveProperty('description');
    }
  });

  test('a fresh simulation with no exam progress shows an UPCOMING_EXAM blocker', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    const blockerTypes = body.blockers.map((b: { type: string }) => b.type);
    expect(blockerTypes).toContain('UPCOMING_EXAM');
  });

  test('a fresh simulation with no joined societies shows a NO_SOCIAL_SUPPORT blocker', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    const blockerTypes = body.blockers.map((b: { type: string }) => b.type);
    expect(blockerTypes).toContain('NO_SOCIAL_SUPPORT');
  });

  test('STUDYING is marked not allowed after 3 consecutive hours already studied', () => {
    const session = register();
    const simulationId = createSimulation(session);

    applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    const studyOption = body.options.find((o: { action: string }) => o.action === 'STUDYING');
    expect(studyOption).toBeDefined();
    expect(studyOption.allowed).toBe(false);
  });

  test('low energy after heavy studying produces a LOW_ENERGY blocker', () => {
    const session = register();
    const simulationId = createSimulation(session);

    applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(session, simulationId, 'SLEEPING', 1);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(session, simulationId, 'SLEEPING', 1);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1-COMP1531');

    const res = getPlan(session, simulationId);
    const body = JSON.parse(res.body.toString());

    const blockerTypes = body.blockers.map((b: { type: string }) => b.type);
    expect(blockerTypes).toContain('LOW_ENERGY');
  });
});
