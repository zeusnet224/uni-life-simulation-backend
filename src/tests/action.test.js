// Tests for simulationApplyAction in action.js
// Covers: all 5 action types, error validation, activity constraints,
// stat calculations, return value shape, and win/lose conditions
import { describe, test, expect, beforeEach } from 'vitest';
import { simulationApplyAction } from '../action.js';
import { authRegister } from '../auth.js';
import { simulationCreate } from '../simulation.js';
import { clear } from '../other.js';

// simple universe with 1 course and 3 exams for testing
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

////////////////////////////////////////////////////////////////
// These are helper to register a student and create a simulation
//Avoids repeating setup code in every test. It does 3 things:

//Calls authRegister from src/auth.js to register a student
// with studentId z5555555 Calls simulationCreate from simulation.js
// to create a simulation using SIMPLE_UNIVERSE (A simple universe
// at the top of the test file to use across all my tests)
//Returns the simulationId so the test can use it
////////////////////////////////////////////////////////////////

function setupSim(universe = SIMPLE_UNIVERSE) {
  authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
  const { simulationId } = simulationCreate(STUDENT_ID, universe);
  return simulationId;
}

// reset state before every test so tests are independent
beforeEach(() => { clear(); });
// Call sim here

// Tests that INVALID_ACTION is returned when the
// action string is not one of the 5 valid types.
// INVALID_ACTION must be returned before INVALID_DURATION
// when both are wrong.
describe('INVALID_ACTION errors', () => {
  test('unrecognised action string', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'FLYING', 1).error).toBe('INVALID_ACTION');
  });
  test('empty string', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, '', 1).error).toBe('INVALID_ACTION');
  });
  test('lowercase action string', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'studying', 1, 'E1-COMP1531').error).toBe('INVALID_ACTION');
  });
  test('INVALID_ACTION returned before INVALID_DURATION when both wrong', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'FLYING', 0).error).toBe('INVALID_ACTION');
  });
});

// Tests that INVALID_DURATION is returned when duration is 0, negative, or a fraction.
// Duration must be a positive integer of at least 1 hour.
describe('INVALID_DURATION errors', () => {
  test('duration of 0', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 0).error).toBe('INVALID_DURATION');
  });
  test('negative duration', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'EATING', -1).error).toBe('INVALID_DURATION');
  });
  test('fractional duration 0.5', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 0.5).error).toBe('INVALID_DURATION');
  });
  test('fractional duration 2.5', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2.5).error).toBe('INVALID_DURATION');
  });
});

// Tests that INVALID_STUDENT_ID is returned when the studentId does not belong to a registered student.
describe('INVALID_STUDENT_ID errors', () => {
  test('unregistered student', () => {
  // No simulation needs to be set up — INVALID_STUDENT_ID is checked before INVALID_SIMULATION
  expect(simulationApplyAction('z9999999', 1, 'SLEEPING', 1).error).toBe('INVALID_STUDENT_ID');
  });
});

// Tests that INVALID_SIMULATION is returned when the simulationId does not exist
// or when the simulation belongs to a different student.
////////////////////////////////////////////////////////////////
// Tests that a simulationId of 99999 that does not exist in data.simulations
// returns INVALID_SIMULATION
////////////////////////////////////////////////////////////////
describe('INVALID_SIMULATION errors', () => {
  test('non-existent simulationId', () => {
    setupSim();
    expect(simulationApplyAction(STUDENT_ID, 99999, 'SLEEPING', 1).error).toBe('INVALID_SIMULATION');
  });
////////////////////////////////////////////////////////////////
// Tests that a valid simulation owned by z5555555 cannot be
// accessed by z6666666 — returns INVALID_SIMULATION
////////////////////////////////////////////////////////////////
  test('simulation belongs to a different student', () => {
    const simId = setupSim();
    authRegister('z6666666', PASSWORD, 'Jane', 'Doe');
    expect(simulationApplyAction('z6666666', simId, 'SLEEPING', 1).error).toBe('INVALID_SIMULATION');
  });
});

// Tests that SIMULATION_ENDED is returned when trying to perform an action
// on a simulation that has already GRADUATED or DROPPED_OUT.
///////////////////////////////////////////////////////////////
// Tests that after draining energy to 0 through studying,
// the simulation becomes DROPPED_OUT and any further action
// returns SIMULATION_ENDED
////////////////////////////////////////////////////////////////
describe('SIMULATION_ENDED errors', () => {
  test('returns SIMULATION_ENDED after simulation DROPPED_OUT', () => {
    const simId = setupSim();
    // drain energy to 0: each study session costs 45 energy with breaks to restore 15
    // 100 - 45 = 55, +15 = 70, -45 = 25, +15 = 40, -45 = -5 → 0
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
});

// Tests that INVALID_EXAM is returned when STUDYING is attempted without an examId
// or with an examId that does not exist in this simulation.
describe('INVALID_EXAM errors', () => {
  test('no examId provided for STUDYING', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1).error).toBe('INVALID_EXAM');
  });
  test('examId does not exist in this simulation', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E1-FAKE0000').error).toBe('INVALID_EXAM');
  });
});

// Tests the STUDYING consecutive-hours constraint.
// A student can study for a maximum of 3 consecutive hours.
// After 3 hours they must perform a different activity for at least 1 hour before studying again.
describe('STUDYING consecutive-hours constraint', () => {
  test('allows exactly 3 consecutive hours', () => {
    const simId = setupSim();
    const result = simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    //Expect to be VALID
    expect(result.error).toBeUndefined();
    expect(result.timeElapsed).toBe(3);
  });
  test('INVALID_ACTION when single action exceeds 3 hours', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 4, 'E1-COMP1531').error).toBe('INVALID_ACTION');
  });
  test('INVALID_ACTION when consecutive hours exceed 3 across actions', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531').error).toBe('INVALID_ACTION');
  });
  ////////////////////////////////////////////////////////////////
  //Tests that after studying 3 hours, sleeping 1 hour resets
  // the streak and studying can resume. Checks no error and timeElapsed is 5
  ////////////////////////////////////////////////////////////////
  test('allows studying again after 1-hour non-study break', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    const result = simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E1-COMP1531');
    expect(result.error).toBeUndefined();
    expect(result.timeElapsed).toBe(5);
  });
  test('streak resets after any non-study activity', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    const result = simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(result.error).toBeUndefined();
    expect(result.timeElapsed).toBe(6);
  });
});

// Tests the EXERCISING constraints.
// Rule 1: student must have eaten within the last 4 hours of when exercise ends.
// Rule 2: there must be at least a 1-hour cooldown between exercise sessions.
describe('EXERCISING constraint: eating window', () => {
  test('INVALID_ACTION when no eating has occurred', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBe('INVALID_ACTION');
  });
  test('allows exercising immediately after eating', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBeUndefined();
  });
  ////////////////////////////////////////////////////////////////
  //Tests that exercising for 5 hours after eating at hour 1 returns
  // INVALID_ACTION — exercise would end at hour 6, 6 minus 1 equals
  // 5 which is greater than 4
  ////////////////////////////////////////////////////////////////
  test('INVALID_ACTION when eating ended more than 4 hours before exercise ends', () => {
    const simId = setupSim();
    // eat at hour 0-1, then pass 4+ hours before exercising
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    // exercise ends at hour 6, eating ended at hour 1, 6-1=5 > 4 so invalid
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBe('INVALID_ACTION');
  });
  test('eating exactly within 4 hours of exercise end is valid', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    // exercise ends at hour 4, eating ended at hour 1, 4-1=3 <= 4 so valid
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBeUndefined();
  });
  test('INVALID_ACTION when exercise duration pushes outside eating window', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    // exercise 5hrs ends at hour 6, eating ended at hour 1, 6-1=5 > 4 so invalid
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 5).error).toBe('INVALID_ACTION');
  });
});
////////////////////////////////////////////////////////////////
//Tests that exercising twice in a row without waiting 1 hour
// returns INVALID_ACTION — first exercise ends at hour 2, trying
// again at hour 2 violates the cooldown
////////////////////////////////////////////////////////////////
describe('EXERCISING constraint: 1-hour cooldown', () => {
  test('INVALID_ACTION within cooldown period', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1);
    // cooldown: next exercise must start at hour 3, current time is 2 so invalid
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBe('INVALID_ACTION');
  });
  test('allows exercising after cooldown has passed', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 1);
    // re-eat so the 4 hour window is satisfied for second exercise
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1);
    //Since no error is returned this is allowed there is an hour break in
    // between excercsing and studying
    expect(simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 1).error).toBeUndefined();
  });
});

// Tests that each action applies the correct energy and happiness changes per hour.
// Stats are clamped to the 0-100 range after every update.
 ////////////////////////////////////////////////////////////////
// Label: Tests DOOM_SCROLLING for 2 hours. Energy 100 plus 6 equals 106 clamped to 100.
// Happiness 50 plus 4 equals 54
 ////////////////////////////////////////////////////////////////
describe('Stat calculations', () => {
  test('DOOM_SCROLLING: energy +3/hr, happiness +2/hr', () => {
    const simId = setupSim();
    // initial energy=100, happiness=50
    const result = simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 2);
    expect(result.energy).toBe(100);   // 100 + 6 = 106 clamped to 100
    expect(result.happiness).toBe(54); // 50 + 4 = 54
  });
  test('STUDYING: energy -15/hr, happiness -5/hr', () => {
    const simId = setupSim();
    const result = simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(result.energy).toBe(70);    // 100 - 30 = 70
    expect(result.happiness).toBe(40); // 50 - 10 = 40
  });
  test('SLEEPING: energy +15/hr, happiness +2/hr', () => {
    const simId = setupSim();
    // drain first so we can see the increase
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531'); // energy=55, hap=35
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);                 // energy=70, hap=37
    const result = simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    expect(result.energy).toBe(100);   // 70 + 30 = 100
    expect(result.happiness).toBe(41); // 37 + 4 = 41
  });
  test('EATING: energy +10/hr, happiness +3/hr', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531'); // energy=55, hap=35
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);                 // energy=70, hap=37
    const result = simulationApplyAction(STUDENT_ID, simId, 'EATING', 2);
    expect(result.energy).toBe(90);    // 70 + 20 = 90
    expect(result.happiness).toBe(43); // 37 + 6 = 43
  });
  test('EXERCISING: energy -10/hr, happiness +6/hr', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'EATING', 1); // energy=100, hap=53
    const result = simulationApplyAction(STUDENT_ID, simId, 'EXERCISING', 2);
    expect(result.energy).toBe(80);    // 100 - 20 = 80
    expect(result.happiness).toBe(65); // 53 + 12 = 65
  });
  test('stats clamped to 100 maximum', () => {
    const simId = setupSim();
    const result = simulationApplyAction(STUDENT_ID, simId, 'DOOM_SCROLLING', 30);
    expect(result.energy).toBe(100);
    expect(result.happiness).toBe(100);
  });
   ////////////////////////////////////////////////////////////////
  // Tests the full dropout flow — draining energy to 0 through repeated
  // studying causes simulationStatus to become DROPPED_OUT and the next
  // action returns SIMULATION_ENDED
 ////////////////////////////////////////////////////////////////
  test('energy hitting 0 triggers DROPPED_OUT', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531'); // energy = 0
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
});

// Tests that a successful action returns all required fields with correct values.
 ////////////////////////////////////////////////////////////////
 //Tests that the return value has all 6 required fields — simulationId, currentActivity, duration, energy, happiness, timeElapsed
//javascript matches the vlue inputed
  ////////////////////////////////////////////////////////////////
describe('Return value shape', () => {
  test('returns all required fields', () => {
    const simId = setupSim();
    const result = simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    expect(result).toHaveProperty('simulationId');
    expect(result).toHaveProperty('currentActivity');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('energy');
    expect(result).toHaveProperty('happiness');
    expect(result).toHaveProperty('timeElapsed');
  });
  test('duration matches input', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 3).duration).toBe(3);
  });
  test('simulationId matches input', () => {
    const simId = setupSim();
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).simulationId).toBe(simId);
  });
  test('energy and happiness are integers', () => {
    const simId = setupSim();
    const result = simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E1-COMP1531');
    expect(Number.isInteger(result.energy)).toBe(true);
    expect(Number.isInteger(result.happiness)).toBe(true);
  });
});

// Tests that timeElapsed accumulates correctly across multiple actions
// and that currentActivity always reflects the most recently performed action.
describe('timeElapsed and currentActivity', () => {
  test('timeElapsed accumulates across multiple actions', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    const result = simulationApplyAction(STUDENT_ID, simId, 'EATING', 3);
    expect(result.timeElapsed).toBe(5);
  });
  test('currentActivity reflects most recent action', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    expect(simulationApplyAction(STUDENT_ID, simId, 'EATING', 1).currentActivity).toBe('EATING');
  });
});