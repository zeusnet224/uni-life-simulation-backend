// Tests for simulationCreate, simulationStatus and simulationsList in simulation.js
// Covers: error validation, DROPPED_OUT conditions from energy/happiness/course/exam failures
import { describe, expect, test, beforeEach } from 'vitest';
import { simulationCreate, simulationStatus } from '../simulation.js';
import { authRegister } from '../auth.js';
import { loadData } from '../dataStore.js';
import { simulationApplyAction } from '../action.js';
import { clear } from '../other.js';
import { UniverseData } from '../types.js';

type SimulationStatusResult = {
  simulationStatus: string;
  currentActivity: string;
  energy: number;
  happiness: number;
  timeElapsed: number;
  error?: string;
  message?: string;
};

function status(studentId: string, simulationId: number): SimulationStatusResult {
  return simulationStatus(studentId, simulationId) as SimulationStatusResult;
}

const customUniverse = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
      courseStatus: 'FAILED',
    }
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
  clear();
});

// Tests that simulationStatus returns the correct error when given invalid inputs.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
describe('simulationStatus return errors', () => {
  test('Returns an error for invalid StudentId that doesnt exist', () => {
    authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
    const testSim = status('z7654321', 100);
    expect(testSim).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('Returns an error for invalid SimulationId that doesnt exist', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const testSim = status(studentId, 50000);
    expect(testSim).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('Returns an error for invalid SimulationId that does not belong to given student', () => {
    const { studentId: studentId1 } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { studentId: studentId2 } = authRegister('z7654321', 'Pikachu123', 'Ash', 'Ketchum') as { studentId: string };
    const { simulationId } = simulationCreate(studentId1, customUniverse) as { simulationId: number };
    const testSim = status(studentId2, simulationId);
    expect(testSim).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
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
    const universeData = loadData('universes/universe1.json') as UniverseData;
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, universeData) as { simulationId: number };
    const examId = universeData.exams[0].examId;

    for (let count = 0; count < 9; count++) {
      simulationApplyAction(studentId, simulationId, 'STUDYING', 3, examId);
      simulationApplyAction(studentId, simulationId, 'DOOM_SCROLLING', 1, examId);
    }

    const testSim = status(studentId, simulationId);
    expect(testSim).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: testSim.currentActivity,
      energy: 0,
      happiness: testSim.happiness,
      timeElapsed: testSim.timeElapsed,
    });
  });

  test('Happiness reaches 0 points', () => {
    const universeData = loadData('universes/universe1.json') as UniverseData;
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, universeData) as { simulationId: number };
    const examId = universeData.exams[0].examId;

    for (let count = 0; count < 5; count++) {
      simulationApplyAction(studentId, simulationId, 'STUDYING', 3, examId);
      simulationApplyAction(studentId, simulationId, 'SLEEPING', 3, examId);
    }

    const testSim = status(studentId, simulationId);
    expect(testSim).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: testSim.currentActivity,
      energy: testSim.energy,
      happiness: 0,
      timeElapsed: testSim.timeElapsed,
    });
  });

  test('Course receives FAILED status', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testSim = status(studentId, simulationId);
    expect(testSim).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: testSim.currentActivity,
      energy: testSim.energy,
      happiness: testSim.happiness,
      timeElapsed: testSim.timeElapsed,
    });
  });

  test('5 total exams failed', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse2) as { simulationId: number };
    const testSim = status(studentId, simulationId);
    expect(testSim).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: testSim.currentActivity,
      energy: testSim.energy,
      happiness: testSim.happiness,
      timeElapsed: testSim.timeElapsed,
    });
  });
});
