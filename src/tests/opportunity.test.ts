import {
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import request from 'sync-request-curl';
import config from './config.json' with { type: 'json' };
import universeData from '../../universes/universe4.json' with {
  type: 'json'
};

const { port, url } = config;
const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  request('DELETE', `${SERVER_URL}/clear`, {
    timeout: TIMEOUT_MS,
  });
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

// Creates a simulation using universe4 and returns its ID.
function createSimulation(session: string): number {
  const response = request(
    'POST',
    `${SERVER_URL}/simulations`,
    {
      headers: { session },
      json: { universeData },
      timeout: TIMEOUT_MS,
    }
  );

  return JSON.parse(response.body.toString()).simulationId;
}

function joinOpportunity(
  session: string,
  simulationId: number,
  opportunityId: string
) {
  return request(
    'POST',
    `${SERVER_URL}/simulations/${simulationId}/opportunities/${opportunityId}/join`,
    {
      headers: { session },
      timeout: TIMEOUT_MS,
    }
  );
}

function leaveOpportunity(
  session: string,
  simulationId: number,
  opportunityId: string
) {
  return request(
    'DELETE',
    `${SERVER_URL}/simulations/${simulationId}/opportunities/${opportunityId}/leave`,
    {
      headers: { session },
      timeout: TIMEOUT_MS,
    }
  );
}

function applyOpportunity(
  session: string,
  simulationId: number,
  opportunityId: string,
  examId: string
) {
  return request(
    'POST',
    `${SERVER_URL}/simulations/${simulationId}/opportunities/${opportunityId}/apply`,
    {
      headers: { session },
      json: { examId },
      timeout: TIMEOUT_MS,
    }
  );
}

function getSimulationStatus(
  session: string,
  simulationId: number
) {
  return request(
    'GET',
    `${SERVER_URL}/simulations/${simulationId}`,
    {
      headers: { session },
      timeout: TIMEOUT_MS,
    }
  );
}

describe('GET /simulations/:simulationId/opportunities', () => {
  test('returns all opportunities as initially not joined', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const response = request(
      'GET',
      `${SERVER_URL}/simulations/${simulationId}/opportunities`,
      {
        headers: { session },
        timeout: TIMEOUT_MS,
      }
    );

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.body.toString())).toStrictEqual({
      opportunities: universeData.opportunities.map(opportunity => ({
        ...opportunity,
        isJoined: false,
      })),
    });
  });
});

describe('POST /simulations/:simulationId/opportunities/:opportunityId/join', () => {
  test('joins an opportunity successfully', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const response = joinOpportunity(
      session,
      simulationId,
      'peer-mentoring'
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body.toString())).toStrictEqual({
      opportunityId: 'peer-mentoring',
      isJoined: true,
    });
  });

  test('rejects joining the same opportunity twice', () => {
    const session = register();
    const simulationId = createSimulation(session);

    joinOpportunity(session, simulationId, 'peer-mentoring');

    const response = joinOpportunity(
      session,
      simulationId,
      'peer-mentoring'
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body.toString())).toMatchObject({
      error: 'ALREADY_JOINED',
    });
  });

  test('rejects joining more than 3 opportunities', () => {
    const session = register();
    const simulationId = createSimulation(session);

    joinOpportunity(session, simulationId, 'peer-mentoring');
    joinOpportunity(session, simulationId, 'student-volunteering');
    joinOpportunity(session, simulationId, 'coding-workshop');

    const response = joinOpportunity(
      session,
      simulationId,
      'student-leadership'
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body.toString())).toMatchObject({
      error: 'OPPORTUNITY_LIMIT_REACHED',
    });
  });

  test('rejects an opportunity ID that does not exist', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const response = joinOpportunity(
      session,
      simulationId,
      'not-a-real-opportunity'
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body.toString())).toMatchObject({
      error: 'INVALID_OPPORTUNITY',
    });
  });
});

describe('DELETE /simulations/:simulationId/opportunities/:opportunityId/leave', () => {
  test('leaves a joined opportunity and returns isJoined false', () => {
    const session = register();
    const simulationId = createSimulation(session);

    joinOpportunity(session, simulationId, 'peer-mentoring');

    const response = leaveOpportunity(
      session,
      simulationId,
      'peer-mentoring'
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body.toString())).toStrictEqual({
      opportunityId: 'peer-mentoring',
      isJoined: false,
    });
  });

  test('rejects leaving an opportunity that was not joined', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const response = leaveOpportunity(
      session,
      simulationId,
      'peer-mentoring'
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body.toString())).toMatchObject({
      error: 'OPPORTUNITY_NOT_JOINED',
    });
  });

  test('allows another opportunity to be joined after leaving one', () => {
    const session = register();
    const simulationId = createSimulation(session);

    joinOpportunity(session, simulationId, 'peer-mentoring');
    joinOpportunity(session, simulationId, 'student-volunteering');
    joinOpportunity(session, simulationId, 'coding-workshop');

    leaveOpportunity(session, simulationId, 'peer-mentoring');

    const response = joinOpportunity(
      session,
      simulationId,
      'student-leadership'
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body.toString())).toStrictEqual({
      opportunityId: 'student-leadership',
      isJoined: true,
    });
  });
});

describe('POST /simulations/:simulationId/opportunities/:opportunityId/apply', () => {
  test('joining does not immediately apply opportunity effects', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const beforeResponse = getSimulationStatus(
      session,
      simulationId
    );
    const before = JSON.parse(beforeResponse.body.toString());

    joinOpportunity(
      session,
      simulationId,
      'peer-mentoring'
    );

    const afterResponse = getSimulationStatus(
      session,
      simulationId
    );
    const after = JSON.parse(afterResponse.body.toString());

    expect(after.happiness).toBe(before.happiness);
    expect(after.timeElapsed).toBe(before.timeElapsed);
    expect(after.currentActivity).toBe(before.currentActivity);
  });

  test('rejects applying an opportunity that has not been joined', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const examId = universeData.exams[0].examId;

    const response = applyOpportunity(
      session,
      simulationId,
      'peer-mentoring',
      examId
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body.toString())).toMatchObject({
      error: 'OPPORTUNITY_NOT_JOINED',
    });
  });

  test('applies happiness, academic and time effects', () => {
    const session = register();
    const simulationId = createSimulation(session);

    const opportunity = universeData.opportunities.find(
      currentOpportunity =>
        currentOpportunity.opportunityId === 'peer-mentoring'
    );

    if (!opportunity) {
      throw new Error('Test opportunity was not found');
    }

    const examId = universeData.exams[0].examId;

    joinOpportunity(
      session,
      simulationId,
      opportunity.opportunityId
    );

    const response = applyOpportunity(
      session,
      simulationId,
      opportunity.opportunityId,
      examId
    );

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.body.toString())).toStrictEqual({
      opportunityId: opportunity.opportunityId,
      examId,
      happinessEffectApplied: opportunity.happinessBonus,
      academicEffectApplied: opportunity.academicBonus,
      weeklyHoursApplied: opportunity.weeklyHours,
      happiness: 50 + opportunity.happinessBonus,
      studyHoursCompleted: opportunity.academicBonus,
      timeElapsed: opportunity.weeklyHours,
      currentActivity:
        `OPPORTUNITY:${opportunity.opportunityId}`,
    });
  });

  test('rejects an invalid exam ID', () => {
    const session = register();
    const simulationId = createSimulation(session);

    joinOpportunity(
      session,
      simulationId,
      'peer-mentoring'
    );

    const response = applyOpportunity(
      session,
      simulationId,
      'peer-mentoring',
      'NOT-A-REAL-EXAM'
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body.toString())).toMatchObject({
      error: 'INVALID_EXAM',
    });
  });

  test('can apply the effects more than once', () => {
    const session = register();
    const simulationId = createSimulation(session);
    const examId = universeData.exams[0].examId;

    const opportunity = universeData.opportunities.find(
      currentOpportunity =>
        currentOpportunity.opportunityId === 'peer-mentoring'
    );

    if (!opportunity) {
      throw new Error('Test opportunity was not found');
    }

    joinOpportunity(
      session,
      simulationId,
      opportunity.opportunityId
    );

    applyOpportunity(
      session,
      simulationId,
      opportunity.opportunityId,
      examId
    );

    const secondResponse = applyOpportunity(
      session,
      simulationId,
      opportunity.opportunityId,
      examId
    );

    expect(secondResponse.statusCode).toBe(200);

    expect(
      JSON.parse(secondResponse.body.toString())
    ).toMatchObject({
      opportunityId: opportunity.opportunityId,
      examId,
      happiness:
        50 + opportunity.happinessBonus * 2,
      studyHoursCompleted:
        opportunity.academicBonus * 2,
      timeElapsed:
        opportunity.weeklyHours * 2,
    });
  });
});
