import { describe, expect, test, beforeEach } from 'vitest';
import { authRegister } from '../auth.js';
import { simulationCreate, simulationStatus } from '../simulation.js';
import { clear } from '../other.js';
import { clearData, getData } from '../dataStore.js';

const STUDENT_ID = 'z1234567';
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
    ],
    exams: [
      {
        examId: 'E1-COMP1531',
        courseId: 'COMP1531',
        name: 'Quiz 1',
        requiredStudyHours: 2,
      },
    ],
    clubs: [],
    ...overrides,
  };
}

beforeEach(() => {
  clearData();
});

describe('clear', () => {
  test('returns an empty object', () => {
    expect(clear()).toStrictEqual({});
  });

  test('resets users and simulations back to empty arrays', () => {
    registerStudent();
    simulationCreate(STUDENT_ID, makeUniverse());

    expect(getData().users).toHaveLength(1);
    expect(getData().simulations).toHaveLength(1);

    const result = clear();

    expect(result).toStrictEqual({});
    expect(getData().users).toStrictEqual([]);
    expect(getData().simulations).toStrictEqual([]);
  });

  test('removes old students and simulations from the application state', () => {
    registerStudent();
    simulationCreate(STUDENT_ID, makeUniverse());
    const oldSecondSimulation = simulationCreate(STUDENT_ID, makeUniverse()) as { simulationId: number };

    clear();

    expect(simulationStatus(STUDENT_ID, oldSecondSimulation.simulationId)).toStrictEqual({
      error: 'INVALID_STUDENT_ID',
      message: expect.any(String),
    });
  });

  test('allows the same studentId to register again after clearing', () => {
    registerStudent();

    clear();

    expect(registerStudent()).toStrictEqual({ session: expect.any(String) });
  });

  test('resets simulationId generation after clearing', () => {
    registerStudent();
    simulationCreate(STUDENT_ID, makeUniverse());
    simulationCreate(STUDENT_ID, makeUniverse());

    clear();
    registerStudent();

    expect(simulationCreate(STUDENT_ID, makeUniverse())).toStrictEqual({ simulationId: 1 });
  });

  test('can be called repeatedly while the datastore is already empty', () => {
    expect(clear()).toStrictEqual({});
    expect(clear()).toStrictEqual({});
    expect(getData().users).toStrictEqual([]);
    expect(getData().simulations).toStrictEqual([]);
  });
});
