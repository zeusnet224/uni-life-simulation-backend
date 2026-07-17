import { describe, expect, test, beforeEach } from 'vitest';
import { authRegister } from '../auth.js';
import { simulationCreate } from '../simulation.js';
import { clearData, getData } from '../dataStore.js';

const STUDENT_ID = 'z1234567';
const OTHER_STUDENT_ID = 'z7654321';
const PASSWORD = 'ValidPass1';

function registerStudent(studentId = STUDENT_ID) {
  return authRegister(studentId, PASSWORD, 'John', 'Smith');
}

function makeUniverse(overrides = {}) {
  return {
    courses: [
      {
        courseId: 'COMP1531',
        name: 'Software Engineering Fundamentals',
      },
      {
        courseId: 'MATH1081',
        name: 'Discrete Mathematics',
        courseStatus: 'PASSED',
      },
    ],
    exams: [
      {
        examId: 'E1-COMP1531',
        courseId: 'COMP1531',
        name: 'Quiz 1',
        requiredStudyHours: 2,
      },
      {
        examId: 'E2-COMP1531',
        courseId: 'COMP1531',
        name: 'Midterm',
        requiredStudyHours: 3,
        studyHoursCompleted: 1,
        studyProgress: 25,
        examStatus: 'ALREADY_ATTEMPTED',
        examScore: 87,
        examOutcome: 'PASS',
      },
    ],
    clubs: [],
    ...overrides,
  };
}

beforeEach(() => {
  clearData();
});

describe('simulationCreate', () => {
  test('returns INVALID_STUDENT_ID when the student has not been registered', () => {
    const result = simulationCreate(STUDENT_ID, makeUniverse());

    expect(result).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    expect(getData().simulations).toStrictEqual([]);
  });

  test('validates the student before validating the universe data', () => {
    const result = simulationCreate(STUDENT_ID, null);

    expect(result).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    expect(getData().simulations).toStrictEqual([]);
  });

  test.each([
    ['null', null],
    ['a string', 'not an object'],
    ['an array', []],
  ])('returns INVALID_UNIVERSE when universeData is %s', (_description, universeData) => {
    registerStudent();

    const result = simulationCreate(STUDENT_ID, universeData);

    expect(result).toStrictEqual({ error: 'INVALID_UNIVERSE', message: expect.any(String) });
    expect(getData().simulations).toStrictEqual([]);
  });

  test('returns INVALID_UNIVERSE with the provided message when universeData is an error object', () => {
    registerStudent();

    const result = simulationCreate(STUDENT_ID, {
      error: 'INVALID_UNIVERSE',
      message: 'Failed to load universe data',
    });

    expect(result).toStrictEqual({ error: 'INVALID_UNIVERSE', message: 'Failed to load universe data' });
    expect(getData().simulations).toStrictEqual([]);
  });

  test('returns INVALID_UNIVERSE with a fallback message when the error object has no message', () => {
    registerStudent();

    const result = simulationCreate(STUDENT_ID, { error: 'INVALID_UNIVERSE' });

    expect(result).toStrictEqual({ error: 'INVALID_UNIVERSE', message: expect.any(String) });
    expect(getData().simulations).toStrictEqual([]);
  });

  test.each([
    ['missing', {}],
    ['not an array', { courses: 'COMP1531' }],
  ])('returns INVALID_UNIVERSE when courses is %s', (_description, universeData) => {
    registerStudent();

    const result = simulationCreate(STUDENT_ID, universeData);

    expect(result).toStrictEqual({ error: 'INVALID_UNIVERSE', message: expect.any(String) });
    expect(getData().simulations).toStrictEqual([]);
  });

  test('creates a simulation with the expected default simulation state', () => {
    registerStudent();

    const result = simulationCreate(STUDENT_ID, makeUniverse());

    expect(result).toStrictEqual({ simulationId: 1 });
    expect(getData().simulations).toHaveLength(1);
    expect(getData().simulations[0]).toMatchObject({
      simulationId: 1,
      studentId: STUDENT_ID,
      simulationStatus: 'ACTIVE',
      currentActivity: 'DOOM_SCROLLING',
      energy: 100,
      happiness: 50,
      timeElapsed: 0,
      actionHistory: [],
    });
  });

  test('adds default course and exam progress fields without overwriting existing values', () => {
    registerStudent();

    simulationCreate(STUDENT_ID, makeUniverse());
    const simulation = getData().simulations[0];

    expect(simulation.universeData.courses[0]).toStrictEqual(expect.objectContaining({
      courseId: 'COMP1531',
      courseStatus: 'ACTIVE',
    }));

    expect(simulation.universeData.courses[1]).toStrictEqual(expect.objectContaining({
      courseId: 'MATH1081',
      courseStatus: 'PASSED',
    }));

    expect(simulation.universeData.exams[0]).toStrictEqual(expect.objectContaining({
      examId: 'E1-COMP1531',
      studyHoursCompleted: 0,
      studyProgress: 0,
      examStatus: 'NOT_ATTEMPTED',
      examScore: 0,
      examOutcome: 'NIL',
    }));

    expect(simulation.universeData.exams[1]).toStrictEqual(expect.objectContaining({
      examId: 'E2-COMP1531',
      studyHoursCompleted: 1,
      studyProgress: 25,
      examStatus: 'ALREADY_ATTEMPTED',
      examScore: 87,
      examOutcome: 'PASS',
    }));
  });

  test('creates an empty exams array when the universe does not include exams', () => {
    registerStudent();

    simulationCreate(STUDENT_ID, makeUniverse({ exams: undefined }));

    expect(getData().simulations[0].universeData.exams).toStrictEqual([]);
  });

  test('creates unique sequential simulationIds for multiple simulations', () => {
    registerStudent();
    registerStudent(OTHER_STUDENT_ID);

    const firstResult = simulationCreate(STUDENT_ID, makeUniverse());
    const secondResult = simulationCreate(STUDENT_ID, makeUniverse());
    const thirdResult = simulationCreate(OTHER_STUDENT_ID, makeUniverse());

    expect(firstResult).toStrictEqual({ simulationId: 1 });
    expect(secondResult).toStrictEqual({ simulationId: 2 });
    expect(thirdResult).toStrictEqual({ simulationId: 3 });
    expect(getData().simulations.map(simulation => simulation.simulationId)).toStrictEqual([1, 2, 3]);
  });
});