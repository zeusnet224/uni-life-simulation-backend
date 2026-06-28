  import { describe, expect, test, beforeEach } from 'vitest';
  import { simulationCreate, simulationStatus, simulationsList } from './simulation.js'
  import { authRegister } from './auth.js';
  import { loadData } from './dataStore.js';
  import { simulationApplyAction } from './action.js';
  import { clear } from './other.js';

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
    exams : [
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

  describe('simulationStatus return errors', () => {
    test('Returns an error for invalid StudentId that doesnt exist', () => {
      authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const testSim = simulationStatus('z7654321', 100);
      expect(testSim).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    });

    test('Returns an error for invalid SimulationId that doesnt exist', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const testSim = simulationStatus(studentId, 50000);
      expect(testSim).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('Returns an error for invalid SimulationId that does not belong to given student', () => {
      const { studentId: studentId1 } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { studentId: studentId2 } = authRegister('z7654321', 'Pikachu123', 'Ash', 'Ketchum');
      const { simulationId } = simulationCreate(studentId1, customUniverse);
      const testSim = simulationStatus(studentId2, simulationId);
      expect(testSim).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });
  });

  describe('simulationStatus returns DROPPED_OUT', () => {
    test('Energy reaches 0 points', () => {
      const universeData = loadData('universes/universe1.json');
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, universeData);
      const examId = universeData.exams[0].examId;

      for (let count = 0; count < 9; count++) {
        simulationApplyAction(studentId, simulationId, 'STUDYING', 3, examId);
        simulationApplyAction(studentId, simulationId, 'DOOM_SCROLLING', 1, examId);
      }

      const testSim = simulationStatus(studentId, simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: testSim.currentActivity,
        energy: 0,
        happiness: testSim.happiness,
        timeElapsed: testSim.timeElapsed,
      });
    });

    test('Happiness reaches 0 points', () => {
      const universeData = loadData('universes/universe1.json');
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, universeData);
      const examId = universeData.exams[0].examId;

      for (let count = 0; count < 5; count++) {
        simulationApplyAction(studentId, simulationId, 'STUDYING', 3, examId);
        simulationApplyAction(studentId, simulationId, 'SLEEPING', 3, examId);
      }

      const testSim = simulationStatus(studentId, simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: testSim.currentActivity,
        energy: testSim.energy,
        happiness: 0,
        timeElapsed: testSim.timeElapsed,
      });
    });

    test('Course receives FAILED status', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testSim = simulationStatus(studentId, simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: testSim.currentActivity,
        energy: testSim.energy,
        happiness: testSim.happiness,
        timeElapsed: testSim.timeElapsed,
      });
    });

      test('5 total exams failed', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse2);
      const testSim = simulationStatus(studentId, simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: testSim.currentActivity,
        energy: testSim.energy,
        happiness: testSim.happiness,
        timeElapsed: testSim.timeElapsed,
      });
    });
  });
