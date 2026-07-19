// Tests for simulationApplyAction in action.js
// Covers: all 5 action types, error validation, activity constraints,
// stat calculations, return value shape, and win/lose conditions
import { describe, test, expect, beforeEach } from 'vitest';
import { simulationApplyAction, ActionResult } from '../action.js';
import { authRegister } from '../auth.js';
import { simulationCreate } from '../simulation.js';
import { clear } from '../other.js';

type ActionResultOrError = ActionResult & { error?: string; message?: string };

function applyAction(
  studentId: string,
  simulationId: number,
  action: string,
  duration: number,
  examId?: string
): ActionResultOrError {
  return simulationApplyAction(studentId, simulationId, action, duration, examId) as ActionResultOrError;
}

const SIMPLE_UNIVERSE = {
  courses: [
    { courseId: 'COMP1531', name: 'Software Engineering Fundamentals' },
  ],
  exams: [
    { examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'Quiz 1',  requiredStudyHours: 2 },
    { examId: 'E2-COMP1531', courseId: 'COMP1531', name: 'Midterm', requiredStudyHours: 3 },
    { examId: 'E3-COMP1531', courseId: 'COMP1531', name: 'Final',   requiredStudyHours: 1 },
  ],
};

const STUDENT_ID = 'z5555555';
const PASSWORD   = 'ValidPass1';

function setupSim(universe = SIMPLE_UNIVERSE): number {
  authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
  const result = simulationCreate(STUDENT_ID, universe) as { simulationId: number };
  return result.simulationId;
}

beforeEach(() => { clear(); });

describe('INVALID_ACTION errors', () => {
  test('unrecognised action string', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'FLYING', 1).error).toBe('INVALID_ACTION');
  });
  test('empty string', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, '', 1).error).toBe('INVALID_ACTION');
  });
  test('lowercase action string', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'studying', 1, 'E1-COMP1531').error).toBe('INVALID_ACTION');
  });
  test('INVALID_ACTION returned before INVALID_DURATION when both wrong', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'FLYING', 0).error).toBe('INVALID_ACTION');
  });
});

describe('INVALID_DURATION errors', () => {
  test('duration of 0', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 0).error).toBe('INVALID_DURATION');
  });
  test('negative duration', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'EATING', -1).error).toBe('INVALID_DURATION');
  });
  test('fractional duration 0.5', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 0.5).error).toBe('INVALID_DURATION');
  });
  test('fractional duration 2.5', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 2.5).error).toBe('INVALID_DURATION');
  });
});

describe('INVALID_STUDENT_ID errors', () => {
  test('unregistered student', () => {
    expect(applyAction('z9999999', 1, 'SLEEPING', 1).error).toBe('INVALID_STUDENT_ID');
  });
});

describe('INVALID_SIMULATION errors', () => {
  test('non-existent simulationId', () => {
    setupSim();
    expect(applyAction(STUDENT_ID, 99999, 'SLEEPING', 1).error).toBe('INVALID_SIMULATION');
  });
  test('simulation belongs to a different student', () => {
    const simId = setupSim();
    authRegister('z6666666', PASSWORD, 'Jane', 'Doe');
    expect(applyAction('z6666666', simId, 'SLEEPING', 1).error).toBe('INVALID_SIMULATION');
  });
});

describe('SIMULATION_ENDED errors', () => {
  test('returns SIMULATION_ENDED after simulation DROPPED_OUT', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
});

describe('INVALID_EXAM errors', () => {
  test('no examId provided for STUDYING', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'STUDYING', 1).error).toBe('INVALID_EXAM');
  });
  test('examId does not exist in this simulation', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E1-FAKE0000').error).toBe('INVALID_EXAM');
  });
});

describe('STUDYING consecutive-hours constraint', () => {
  test('allows exactly 3 consecutive hours', () => {
    const simId = setupSim();
    const result = applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(result.error).toBeUndefined();
    expect(result.timeElapsed).toBe(3);
  });
  test('INVALID_ACTION when single action exceeds 3 hours', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'STUDYING', 4, 'E1-COMP1531').error).toBe('INVALID_ACTION');
  });
  test('INVALID_ACTION when consecutive hours exceed 3 across actions', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531').error).toBe('INVALID_ACTION');
  });
  test('allows studying again after 1-hour non-study break', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    const result = applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E1-COMP1531');
    expect(result.error).toBeUndefined();
    expect(result.timeElapsed).toBe(5);
  });
  test('streak resets after any non-study activity', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    const result = applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(result.error).toBeUndefined();
    expect(result.timeElapsed).toBe(6);
  });
});

describe('EXERCISING constraint: eating window', () => {
  test('INVALID_ACTION when no eating has occurred', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBe('INVALID_ACTION');
  });
  test('allows exercising immediately after eating', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBeUndefined();
  });
  test('INVALID_ACTION when eating ended more than 4 hours before exercise ends', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBe('INVALID_ACTION');
  });
  test('eating exactly within 4 hours of exercise end is valid', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBeUndefined();
  });
  test('INVALID_ACTION when exercise duration pushes outside eating window', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 5).error).toBe('INVALID_ACTION');
  });
});

describe('EXERCISING constraint: 1-hour cooldown', () => {
  test('INVALID_ACTION within cooldown period', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    applyAction(STUDENT_ID, simId, 'EXERCISING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBe('INVALID_ACTION');
  });
  test('allows exercising after cooldown has passed', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    applyAction(STUDENT_ID, simId, 'EXERCISING', 1);
    applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBeUndefined();
  });
});

describe('Stat calculations', () => {
  test('DOOM_SCROLLING: energy +3/hr, happiness +2/hr', () => {
    const simId = setupSim();
    const result = applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 2);
    expect(result.energy).toBe(100);
    expect(result.happiness).toBe(54);
  });
  test('STUDYING: energy -15/hr, happiness -5/hr', () => {
    const simId = setupSim();
    const result = applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(result.energy).toBe(70);
    expect(result.happiness).toBe(40);
  });
  test('SLEEPING: energy +15/hr, happiness +2/hr', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    const result = applyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    expect(result.energy).toBe(100);
    expect(result.happiness).toBe(41);
  });
  test('EATING: energy +10/hr, happiness +3/hr', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    const result = applyAction(STUDENT_ID, simId, 'EATING', 2);
    expect(result.energy).toBe(90);
    expect(result.happiness).toBe(43);
  });
  test('EXERCISING: energy -10/hr, happiness +6/hr', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'EATING', 1);
    const result = applyAction(STUDENT_ID, simId, 'EXERCISING', 2);
    expect(result.energy).toBe(80);
    expect(result.happiness).toBe(65);
  });
  test('stats clamped to 100 maximum', () => {
    const simId = setupSim();
    const result = applyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 30);
    expect(result.energy).toBe(100);
    expect(result.happiness).toBe(100);
  });
  test('energy hitting 0 triggers DROPPED_OUT', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
});

describe('Return value shape', () => {
  test('returns all required fields', () => {
    const simId = setupSim();
    const result = applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    expect(result).toHaveProperty('simulationId');
    expect(result).toHaveProperty('currentActivity');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('energy');
    expect(result).toHaveProperty('happiness');
    expect(result).toHaveProperty('timeElapsed');
  });
  test('duration matches input', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 3).duration).toBe(3);
  });
  test('simulationId matches input', () => {
    const simId = setupSim();
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).simulationId).toBe(simId);
  });
  test('energy and happiness are integers', () => {
    const simId = setupSim();
    const result = applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E1-COMP1531');
    expect(Number.isInteger(result.energy)).toBe(true);
    expect(Number.isInteger(result.happiness)).toBe(true);
  });
});

describe('timeElapsed and currentActivity', () => {
  test('timeElapsed accumulates across multiple actions', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    const result = applyAction(STUDENT_ID, simId, 'EATING', 3);
    expect(result.timeElapsed).toBe(5);
  });
  test('currentActivity reflects most recent action', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    expect(applyAction(STUDENT_ID, simId, 'EATING', 1).currentActivity).toBe('EATING');
  });
});
