  import { describe, expect, test, beforeEach } from 'vitest';
  import {
    simulationCreate, simulationStatus, simulationsList, simulationApplyAction, examGetStudyAction,
    simulationGetLastAction, simulationGetconcludingNotification
  } from './simulation.js'
  import { clear } from './other.js';
  import { authRegister } from './auth.js';
  import { loadData } from './dataStore.js';

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
      {
        examId: '1',
        examOutcome: 'FAIL',
      },
      {
        examId: '2',
        examOutcome: 'FAIL',
      },
      {
        examId: '3',
        examOutcome: 'FAIL',
      },
      {
        examId: '4',
        examOutcome: 'FAIL',
      },
      {
        examId: '5',
        examOutcome: 'FAIL',
      }
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
      const universeData = loadData('universes/universe1.json');
      const studentId = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      simulationCreate(studentId, universeData);
      const testSim = simulationStatus(studentId, 50000);
      expect(testSim).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('Returns an error for invalid SimulationId that does not belong to given student', () => {
      const universeData = loadData('universes/universe1.json');
      const studentId1 = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const studentId2 = authRegister('z7654321', 'Pikachu', 'Ash', 'Ketchum');
      const simulation = simulationCreate(studentId1, universeData);
      const testSim = simulationStatus(studentId2, simulation.simulationId);
      expect(testSim).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });
  });

  describe('simulationStatus returns DROPPED_OUT', () => {
    test('Energy reaches 0 points', () => {
      const universeData = loadData('universes/universe1.json');
      const studentId = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const simulation = simulationCreate(studentId, universeData);
      const examId = universeData.exams[0].examId;

      for (let count = 0; count < 9; count++) {
        simulationApplyAction(studentId, simulation.simulationId, 'STUDYING', 3, examId);
        simulationApplyAction(studentId, simulation.simulationId, 'DOOM_SCROLLING', 1, examId);
      }

      const testSim = simulationStatus(studentId, simulation.simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: expect.any(String),
        energy: 0,
        happiness: expect.any(Number),
        timeElapsed: expect.any(Number),
      });
    });

    test('Happiness reaches 0 points', () => {
      const universeData = loadData('universes/universe1.json');
      const studentId = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const simulation = simulationCreate(studentId, universeData);
      const examId = universeData.exams[0].examId;

      for (let count = 0; count < 10; count++) {
        simulationApplyAction(studentId, simulation.simulationId, 'STUDYING', 3, examId);
        simulationApplyAction(studentId, simulation.simulationId, 'DOOM_SCROLLING', 1, examId);
      }

      const testSim = simulationStatus(studentId, simulation.simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: expect.any(String),
        energy: expect.any(Number),
        happiness: 0,
        timeElapsed: expect.any(Number),
      });
    });

    test('Course receives FAILED status', () => {
      const studentId = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const simulation = simulationCreate(studentId, customUniverse);
      const testSim = simulationStatus(studentId, simulation.simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: expect.any(String),
        energy: expect.any(Number),
        happiness: expect.any(Number),
        timeElapsed: expect.any(Number),
      });
    });

      test('5 total exams failed', () => {
      const studentId = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const simulation = simulationCreate(studentId, customUniverse2);
      const testSim = simulationStatus(studentId, simulation.simulationId);
      expect(testSim).toStrictEqual({
        simulationStatus: 'DROPPED_OUT',
        currentActivity: expect.any(String),
        energy: expect.any(Number),
        happiness: expect.any(Number),
        timeElapsed: expect.any(Number),
      });
    });
  });
