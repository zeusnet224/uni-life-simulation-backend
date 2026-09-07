import { describe, expect, test, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from '../config.json' with { type: 'json' };

const { port, url } = config;

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

// Registers a student and returns their session token.
function register(): string {
  const response = request(
    'POST',
    `${SERVER_URL}/auth/register`,
    {
      json: {
        studentId: 'z1234567',
        password: 'ILoveComp1531',
        nameFirst: 'John',
        nameLast: 'Smith',
      },
      timeout: TIMEOUT_MS,
    }
  );

  return JSON.parse(response.body.toString()).session;
}

// Creates a simulation for the given session and returns its simulationId.
function createSimulation(session: string, studyHoursCompleted = 0): number {
  const res = request('POST', SERVER_URL + '/simulations', {
    headers: { session },
    json: { universeData:
      {
        courses: [
          {
            courseId: 'COMP1531',
            courseStatus: 'IN_PROGRESS',
          }
        ],
        societies: [],
        exams: [
          {
            examId: 'E1-COMP1531',
            requiredStudyHours: 10,
            studyHoursCompleted
          }
        ],
        opportunities: [
          {
            opportunityId: 'coding-workshop',
            name: 'COMP1531 Coding Workshop',
            description: 'Coding workshop to help you develop your skills in JS',
            happinessBonus: 5,
            academicBonus: 5,
            weeklyHours: 2
          }
        ]
      }
    },
    timeout: TIMEOUT_MS
  });
  return JSON.parse(res.body.toString()).simulationId;
}

describe('GET /simulations/:simulationId/exams/:examId/readiness', () => {
  // returns error for invalid sessoion
  test('return invalid session error', () => {
    const res = request('GET', SERVER_URL + '/simulations/1/exams/E1-COMP1531/readiness', { timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'UNAUTHORISED', message: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  // returns INVALID_SIMULATION when simulationId is invalid
  test('return invalid simulation error', () => {
    const session = register();
    const res = request('GET', SERVER_URL + '/simulations/5000/exams/E1-COMP1531/readiness', { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: 'INVALID_SIMULATION',
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(403);
  });

  // returns INVALID_EXAM when examId is invalid
  test('return invalid exam error', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const res = request('GET', `${SERVER_URL}/simulations/${simulationId}/exams/INVALID/readiness`, { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: 'INVALID_EXAM',
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(400);
  });

  // Returns readiness as LOW
  test('returns LOW readiness when no components are completed', () => {
    const session = register();
    const simulationId = createSimulation(session, 0);
    const res = request('GET', `${SERVER_URL}/simulations/${simulationId}/exams/E1-COMP1531/readiness`, { headers: { session }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      readiness: 'LOW',
      reasons: [
        expect.any(String),
        expect.any(String),
        expect.any(String)
      ]
    });
  });

  // Returns readiness as MEDIUM
  test('returns MEDIUM readiness when two components pass', () => {
    const session = register();
    const simulationId = createSimulation(session, 10);
    request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`,
      { headers: { session }, json: { name: 'Albert Einstein', closeness: 3 }, timeout: TIMEOUT_MS }
    );
    request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`,
      { headers: { session }, json: { name: 'Socrates', closeness: 3 }, timeout: TIMEOUT_MS }
    );
    const res = request('GET', `${SERVER_URL}/simulations/${simulationId}/exams/E1-COMP1531/readiness`,
      { headers: { session }, timeout: TIMEOUT_MS }
    );
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      readiness: 'MEDIUM',
      reasons: [
        expect.any(String),
        expect.any(String),
        expect.any(String)
      ]
    });
  });

  // Returns readiness as HIGH
  test('returns HIGH readiness when all components pass', () => {
    const session = register();
    const simulationId = createSimulation(session, 10);
    request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`,
      { headers: { session }, json: { name: 'Albert Einstein', closeness: 3 }, timeout: TIMEOUT_MS }
    );
    request('POST', `${SERVER_URL}/simulations/${simulationId}/connections`,
      { headers: { session }, json: { name: 'Socrates', closeness: 3 }, timeout: TIMEOUT_MS }
    );
    request('POST', `${SERVER_URL}/simulations/${simulationId}/opportunities/coding-workshop/join`,
      { headers: { session }, timeout: TIMEOUT_MS }
    );
    const res = request('GET', `${SERVER_URL}/simulations/${simulationId}/exams/E1-COMP1531/readiness`,
      { headers: { session }, timeout: TIMEOUT_MS }
    );
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      readiness: 'HIGH',
      reasons: [
        'Has studied 75% of the study hours required. Keep up the good work!',
        'Has a support network with more than two close connections. Having study buddies always boosts readiness for the exam!',
        'Has joined an extracurricular opportunity. A good work-life balance always boosts readiness for the exam!'
      ]
    });
  });
});
