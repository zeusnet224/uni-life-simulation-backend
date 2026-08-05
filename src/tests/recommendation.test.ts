import { describe, expect, test, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from './config.json' with { type: 'json' };

const { port, url } = config;
const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

// Universe with a pending exam and a joinable club.
const examUniverse = {
  courses: [
    { courseId: 'COMP1531', name: 'Software Engineering Fundamentals' },
  ],
  exams: [
    { examId: 'E1', courseId: 'COMP1531', name: 'Quiz 1', requiredStudyHours: 3 },
  ],
  opportunities: [
    {
      opportunityId: 'o1',
      name: 'Robotics Club',
      description: 'Build robots',
      happinessBonus: 5,
      academicBonus: 2,
      weeklyHours: 2,
    },
  ],
};

// Universe with no exams at all (so studying is never an available action).
const noExamUniverse = {
  courses: [
    { courseId: 'COMP1531', name: 'Software Engineering Fundamentals' },
  ],
};

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

// Registers a student and returns their session token.
function register(): string {
  const res = request('POST', SERVER_URL + '/auth/register', {
    json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(res.body.toString()).session;
}

// Creates a simulation for the given session and returns its simulationId.
function createSimulation(session: string, universeData: object): number {
  const res = request('POST', SERVER_URL + '/simulations', {
    headers: { session },
    json: { universeData },
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(res.body.toString()).simulationId;
}

function applyAction(session: string, simulationId: number, action: string, duration: number, examId?: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/action`,
    { headers: { session }, json: { action, duration, examId }, timeout: TIMEOUT_MS });
}

function createConnection(session: string, simulationId: number, name: string, closeness: number) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/connections`,
    { headers: { session }, json: { name, closeness }, timeout: TIMEOUT_MS });
}

function joinOpportunity(session: string, simulationId: number, opportunityId: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/opportunities/${opportunityId}/join`,
    { headers: { session }, timeout: TIMEOUT_MS });
}

function getRecommendation(session: string, simulationId: number) {
  return request('GET', SERVER_URL + `/simulations/${simulationId}/recommendation`,
    { headers: { session }, timeout: TIMEOUT_MS });
}

// Drains a fresh simulation until it DROPS_OUT (energy hits 0).
function driveToDropout(session: string, simulationId: number) {
  applyAction(session, simulationId, 'STUDYING', 3, 'E1');
  applyAction(session, simulationId, 'SLEEPING', 1);
  applyAction(session, simulationId, 'STUDYING', 3, 'E1');
  applyAction(session, simulationId, 'SLEEPING', 1);
  applyAction(session, simulationId, 'STUDYING', 3, 'E1');
}

describe('GET /simulations/:simulationId/recommendation errors', () => {
  test('returns UNAUTHORISED when no session is provided', () => {
    const res = request('GET', SERVER_URL + '/simulations/1/recommendation', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('returns INVALID_SIMULATION for a simulation the student does not own', () => {
    const session = register();
    const res = getRecommendation(session, 9999);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('returns SIMULATION_ENDED once the simulation has concluded', () => {
    const session = register();
    const simulationId = createSimulation(session, examUniverse);
    driveToDropout(session, simulationId);
    const res = getRecommendation(session, simulationId);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'SIMULATION_ENDED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });
});

describe('GET /simulations/:simulationId/recommendation primary is valid and explained', () => {
  test('returns a valid primary with a reason and at least one alternative', () => {
    const session = register();
    const simulationId = createSimulation(session, examUniverse);

    const res = getRecommendation(session, simulationId);
    expect(res.statusCode).toStrictEqual(200);
    const body = JSON.parse(res.body.toString());

    expect(body.recommendation).toMatchObject({
      action: expect.any(String),
      available: true,
      reason: expect.any(String),
    });
    expect(Array.isArray(body.recommendation.alternatives)).toBe(true);
    expect(body.recommendation.alternatives.length).toBeGreaterThanOrEqual(1);
  });

  test('every alternative carries an availability flag and a reason', () => {
    const session = register();
    const simulationId = createSimulation(session, examUniverse);

    const body = JSON.parse(getRecommendation(session, simulationId).body.toString());
    for (const alt of body.recommendation.alternatives) {
      expect(alt).toMatchObject({
        action: expect.any(String),
        available: expect.any(Boolean),
        reason: expect.any(String),
      });
    }
    // At least one alternative is currently unavailable and explains why.
    const unavailable = body.recommendation.alternatives.filter((alt: { available: boolean }) => !alt.available);
    expect(unavailable.length).toBeGreaterThanOrEqual(1);
    expect(unavailable[0].reason).toEqual(expect.any(String));
  });
});

describe('GET /simulations/:simulationId/recommendation reflects the simulation state', () => {
  test('a fresh simulation with a pending exam recommends STUDYING', () => {
    const session = register();
    const simulationId = createSimulation(session, examUniverse);
    const body = JSON.parse(getRecommendation(session, simulationId).body.toString());
    expect(body.recommendation.action).toStrictEqual('STUDYING');
  });

  test('a low-energy simulation recommends SLEEPING', () => {
    const session = register();
    const simulationId = createSimulation(session, examUniverse);
    // Drain energy to 13 without dropping out.
    applyAction(session, simulationId, 'STUDYING', 3, 'E1');
    applyAction(session, simulationId, 'DOOM_SCROLLING', 1);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1');

    const body = JSON.parse(getRecommendation(session, simulationId).body.toString());
    expect(body.recommendation.action).toStrictEqual('SLEEPING');
  });

  test('with no exams to study and a social connection, recommends HANG_OUT', () => {
    const session = register();
    const simulationId = createSimulation(session, noExamUniverse);
    createConnection(session, simulationId, 'Sam', 3);

    const body = JSON.parse(getRecommendation(session, simulationId).body.toString());
    expect(body.recommendation.action).toStrictEqual('HANG_OUT');
  });

  test('with the exam fully studied and a club joined, recommends ATTEND_CLUB_EVENT', () => {
    const session = register();
    const simulationId = createSimulation(session, examUniverse);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1'); // exam now study-ready, so studying is no longer offered
    joinOpportunity(session, simulationId, 'o1');

    const body = JSON.parse(getRecommendation(session, simulationId).body.toString());
    expect(body.recommendation.action).toStrictEqual('ATTEND_CLUB_EVENT');
  });

  test('meaningfully different states produce different primary recommendations', () => {
    const session = register();

    const s1 = createSimulation(session, examUniverse);
    const p1 = JSON.parse(getRecommendation(session, s1).body.toString()).recommendation.action;

    const s2 = createSimulation(session, examUniverse);
    applyAction(session, s2, 'STUDYING', 3, 'E1');
    applyAction(session, s2, 'DOOM_SCROLLING', 1);
    applyAction(session, s2, 'STUDYING', 3, 'E1');
    const p2 = JSON.parse(getRecommendation(session, s2).body.toString()).recommendation.action;

    const s3 = createSimulation(session, noExamUniverse);
    createConnection(session, s3, 'Sam', 3);
    const p3 = JSON.parse(getRecommendation(session, s3).body.toString()).recommendation.action;

    const s4 = createSimulation(session, examUniverse);
    applyAction(session, s4, 'STUDYING', 3, 'E1');
    joinOpportunity(session, s4, 'o1');
    const p4 = JSON.parse(getRecommendation(session, s4).body.toString()).recommendation.action;

    // At least 3 of the 4 primaries are distinct (the acceptance criterion).
    expect(new Set([p1, p2, p3, p4]).size).toBeGreaterThanOrEqual(3);
  });
});
