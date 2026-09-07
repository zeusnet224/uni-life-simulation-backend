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
function createSimulation(session: string): number {
  const res = request('POST', SERVER_URL + '/simulations', {
    headers: { session },
    json: { universeData: customUniverse },
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(res.body.toString()).simulationId;
}

// Creates a social connection and returns its connectionId.
function createConnection(session: string, simulationId: number, name: string, closeness: number): string {
  const res = request('POST', SERVER_URL + `/simulations/${simulationId}/connections`, {
    headers: { session },
    json: { name, closeness },
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(res.body.toString()).connectionId;
}

function joinOpportunity(session: string, simulationId: number, opportunityId: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/opportunities/${opportunityId}/join`,
    { headers: { session }, timeout: TIMEOUT_MS });
}

function applyAction(session: string, simulationId: number, action: string, duration: number, examId?: string) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/action`,
    { headers: { session }, json: { action, duration, examId }, timeout: TIMEOUT_MS });
}

function wellbeing(session: string, simulationId: number, activity: string, targetId: string, duration: number) {
  return request('POST', SERVER_URL + `/simulations/${simulationId}/wellbeing`,
    { headers: { session }, json: { activity, targetId, duration }, timeout: TIMEOUT_MS });
}

// Shared rejection cases that apply regardless of the chosen activity.
describe('POST /simulations/:simulationId/wellbeing shared errors', () => {
  test('returns UNAUTHORISED when no session is provided', () => {
    const res = request('POST', SERVER_URL + '/simulations/1/wellbeing',
      { json: { activity: 'HANG_OUT', targetId: 'x', duration: 1 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('returns INVALID_SIMULATION for a simulation the student does not own', () => {
    const session = register();
    const res = wellbeing(session, 9999, 'HANG_OUT', 'x', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('returns INVALID_ACTIVITY for an unrecognised activity', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = wellbeing(session, simulationId, 'PARTYING', 'x', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_ACTIVITY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test.each([{ duration: 0 }, { duration: 5 }])('returns INVALID_DURATION for duration $duration', ({ duration }) => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = wellbeing(session, simulationId, 'HANG_OUT', 'x', duration);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });
});

// HANG_OUT: happiness scales with the connection's closeness, and it costs energy.
describe('POST /simulations/:simulationId/wellbeing HANG_OUT', () => {
  test('returns INVALID_TARGET when the connection does not exist', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = wellbeing(session, simulationId, 'HANG_OUT', 'not-a-connection', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_TARGET', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('happiness gain scales with closeness and energy is spent', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const connectionId = createConnection(session, simulationId, 'Sam', 5);

    const res = wellbeing(session, simulationId, 'HANG_OUT', connectionId, 2);
    expect(res.statusCode).toStrictEqual(200);
    // From default energy 100 / happiness 50: +4*closeness*duration happiness, -6*duration energy.
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      activity: 'HANG_OUT',
      targetId: connectionId,
      happinessGained: 40,
      energyChanged: -12,
      energy: 88,
      happiness: 90,
      timeElapsed: 2,
      currentActivity: 'HANG_OUT',
    });
  });

  test('returns INSUFFICIENT_ENERGY when energy cannot cover the cost', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const connectionId = createConnection(session, simulationId, 'Sam', 3);
    // Drain energy to 13 (still ACTIVE) so a 4-hour hang-out (cost 24) is unaffordable.
    applyAction(session, simulationId, 'STUDYING', 3, 'E1');
    applyAction(session, simulationId, 'DOOM_SCROLLING', 1);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1');

    const res = wellbeing(session, simulationId, 'HANG_OUT', connectionId, 4);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INSUFFICIENT_ENERGY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });
});

// ATTEND_CLUB_EVENT: restores happiness and some energy, but is gated on a
// joined club, a minimum energy to turn up, and a minimum of banked study hours.
describe('POST /simulations/:simulationId/wellbeing ATTEND_CLUB_EVENT', () => {
  test('returns INVALID_TARGET when the club does not exist', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = wellbeing(session, simulationId, 'ATTEND_CLUB_EVENT', 'not-a-club', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_TARGET', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('returns INVALID_TARGET when the club exists but has not been joined', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = wellbeing(session, simulationId, 'ATTEND_CLUB_EVENT', 'o1', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_TARGET', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('returns INSUFFICIENT_STUDY_HOURS before enough study hours are banked', () => {
    const session = register();
    const simulationId = createSimulation(session);
    joinOpportunity(session, simulationId, 'o1');
    const res = wellbeing(session, simulationId, 'ATTEND_CLUB_EVENT', 'o1', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INSUFFICIENT_STUDY_HOURS', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('returns INSUFFICIENT_ENERGY when energy is below the attend threshold', () => {
    const session = register();
    const simulationId = createSimulation(session);
    joinOpportunity(session, simulationId, 'o1');
    // Drain energy to 13 (< 20) while banking 6 study hours (>= 3).
    applyAction(session, simulationId, 'STUDYING', 3, 'E1');
    applyAction(session, simulationId, 'DOOM_SCROLLING', 1);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1');

    const res = wellbeing(session, simulationId, 'ATTEND_CLUB_EVENT', 'o1', 1);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INSUFFICIENT_ENERGY', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('restores happiness and some energy once all prerequisites are met', () => {
    const session = register();
    const simulationId = createSimulation(session);
    applyAction(session, simulationId, 'STUDYING', 3, 'E1'); // banks 3 study hours; energy 55, happiness 35
    joinOpportunity(session, simulationId, 'o1');

    const res = wellbeing(session, simulationId, 'ATTEND_CLUB_EVENT', 'o1', 2);
    expect(res.statusCode).toStrictEqual(200);
    // +12 happiness/hr, +4 energy/hr, over 2 hours.
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      activity: 'ATTEND_CLUB_EVENT',
      targetId: 'o1',
      happinessGained: 24,
      energyChanged: 8,
      energy: 63,
      happiness: 59,
      timeElapsed: 5,
      currentActivity: 'ATTEND_CLUB_EVENT',
    });
  });
});
