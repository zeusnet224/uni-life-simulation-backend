// Tests for the designed functions in simulation.js:
// simulationsList, examGetStudyAction, simulationGetLastAction, simulationGetConcludingNotification
import { describe, expect, test, beforeEach } from 'vitest';
import { authRegister } from '../auth.js';
import {
  simulationCreate,
  simulationsList,
  examGetStudyAction,
  simulationGetLastAction,
  simulationGetConcludingNotification,
} from '../simulation.js';
import { simulationApplyAction } from '../action.js';
import { clear } from '../other.js';

const STUDENT_ID = 'z1234567';
const PASSWORD = 'ValidPass1';

const SIMPLE_UNIVERSE = {
  courses: [
    { courseId: 'COMP1531', name: 'Software Engineering Fundamentals' },
  ],
  exams: [
    { examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'Quiz 1', requiredStudyHours: 2 },
  ],
};

// helper to register a student and create a simulation, returning both IDs
function setupSim(universe = SIMPLE_UNIVERSE) {
  authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
  const { simulationId } = simulationCreate(STUDENT_ID, universe);
  return simulationId;
}

beforeEach(() => { clear(); });

// Tests that simulationsList returns all simulations belonging to a student,
// each with summary info (simulationId, simulationStatus, currentActivity, timeElapsed).
// Errors: INVALID_STUDENT_ID
describe('simulationsList', () => {
  test('returns INVALID_STUDENT_ID for an unregistered student', () => {
    expect(simulationsList('z9999999').error).toBe('INVALID_STUDENT_ID');
  });

  test('returns an empty list when the student has no simulations', () => {
    authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
    expect(simulationsList(STUDENT_ID)).toStrictEqual({ simulations: [] });
  });

  test('returns a single simulation with correct summary fields', () => {
    const simId = setupSim();
    const result = simulationsList(STUDENT_ID);
    expect(result.simulations).toHaveLength(1);
    expect(result.simulations[0]).toStrictEqual({
      simulationId: simId,
      simulationStatus: 'ACTIVE',
      currentActivity: 'DOOM_SCROLLING',
      timeElapsed: 0,
    });
  });

  test('returns multiple simulations for the same student', () => {
    setupSim();
    setupSim();
    const result = simulationsList(STUDENT_ID);
    expect(result.simulations).toHaveLength(2);
  });

  test('does not include simulations belonging to a different student', () => {
    setupSim();
    authRegister('z7654321', PASSWORD, 'Jane', 'Doe');
    expect(simulationsList('z7654321')).toStrictEqual({ simulations: [] });
  });

  test('reflects updated state after an action is performed', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    const result = simulationsList(STUDENT_ID);
    expect(result.simulations[0].currentActivity).toBe('SLEEPING');
    expect(result.simulations[0].timeElapsed).toBe(2);
  });
});

// Tests that examGetStudyAction identifies the exam most recently studied for.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, NO_STUDY_ACTION
describe('examGetStudyAction', () => {
  test('returns INVALID_STUDENT_ID for an unregistered student', () => {
    const simId = setupSim();
    expect(examGetStudyAction('z9999999', simId).error).toBe('INVALID_STUDENT_ID');
  });

  test('returns INVALID_SIMULATION for a non-existent simulation', () => {
    authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
    expect(examGetStudyAction(STUDENT_ID, 99999).error).toBe('INVALID_SIMULATION');
  });

  test('returns INVALID_SIMULATION when the simulation belongs to a different student', () => {
    const simId = setupSim();
    authRegister('z7654321', PASSWORD, 'Jane', 'Doe');
    expect(examGetStudyAction('z7654321', simId).error).toBe('INVALID_SIMULATION');
  });

  test('returns NO_STUDY_ACTION when no actions have been performed', () => {
    const simId = setupSim();
    expect(examGetStudyAction(STUDENT_ID, simId).error).toBe('NO_STUDY_ACTION');
  });

  test('returns NO_STUDY_ACTION when the most recent action was not STUDYING', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    expect(examGetStudyAction(STUDENT_ID, simId).error).toBe('NO_STUDY_ACTION');
  });

  test('returns the correct exam after a STUDYING action', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(examGetStudyAction(STUDENT_ID, simId)).toStrictEqual({
      examId: 'E1-COMP1531',
      name: 'Quiz 1',
      duration: 2,
    });
  });
});

// Tests that simulationGetLastAction returns the most recently performed action and its duration.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, NO_ACTION_PERFORMED
describe('simulationGetLastAction', () => {
  test('returns INVALID_STUDENT_ID for an unregistered student', () => {
    const simId = setupSim();
    expect(simulationGetLastAction('z9999999', simId).error).toBe('INVALID_STUDENT_ID');
  });

  test('returns INVALID_SIMULATION for a non-existent simulation', () => {
    authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
    expect(simulationGetLastAction(STUDENT_ID, 99999).error).toBe('INVALID_SIMULATION');
  });

  test('returns NO_ACTION_PERFORMED when no actions have been performed yet', () => {
    const simId = setupSim();
    expect(simulationGetLastAction(STUDENT_ID, simId).error).toBe('NO_ACTION_PERFORMED');
  });

  test('returns the most recent action after one action is performed', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 3);
    expect(simulationGetLastAction(STUDENT_ID, simId)).toStrictEqual({
      currentActivity: 'SLEEPING',
      duration: 3,
      timeElapsed: 3,
    });
  });

  test('reflects the latest action after multiple actions', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    expect(simulationGetLastAction(STUDENT_ID, simId)).toStrictEqual({
      currentActivity: 'EATING',
      duration: 1,
      timeElapsed: 3,
    });
  });
});

// Tests that simulationGetConcludingNotification signals when a simulation has ended
// (GRADUATED or DROPPED_OUT) and that no further actions should be applied.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, SIMULATION_NOT_ENDED
describe('simulationGetConcludingNotification', () => {
  test('returns INVALID_STUDENT_ID for an unregistered student', () => {
    const simId = setupSim();
    expect(simulationGetConcludingNotification('z9999999', simId).error).toBe('INVALID_STUDENT_ID');
  });

  test('returns INVALID_SIMULATION for a non-existent simulation', () => {
    authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
    expect(simulationGetConcludingNotification(STUDENT_ID, 99999).error).toBe('INVALID_SIMULATION');
  });

  test('returns SIMULATION_NOT_ENDED while the simulation is still ACTIVE', () => {
    const simId = setupSim();
    expect(simulationGetConcludingNotification(STUDENT_ID, simId).error).toBe('SIMULATION_NOT_ENDED');
  });

  test('returns a DROPPED_OUT notification once energy reaches 0', () => {
    const simId = setupSim();
    // drain energy to 0 via repeated studying/sleeping cycles
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531'); // energy = 0
    const result = simulationGetConcludingNotification(STUDENT_ID, simId);
    expect(result.simulationStatus).toBe('DROPPED_OUT');
    expect(result.notification).toEqual(expect.any(String));
  });
});