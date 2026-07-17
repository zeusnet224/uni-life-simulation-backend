import { describe, test, expect, beforeEach } from 'vitest';
import { examStudyProgress, examAttemptRecord } from './exam.js';
import { simulationApplyAction } from './action.js';
import { authRegister } from './auth.js';
import { simulationCreate } from './simulation.js';
import { clear } from './other.js';

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

// helper to register a student and create a simulation
function setupSim(universe = SIMPLE_UNIVERSE) {
  authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
  const { simulationId } = simulationCreate(STUDENT_ID, universe);
  return simulationId;
}

// reset state before every test so tests are independent
beforeEach(() => { clear(); });

// Tests that INVALID_STUDENT_ID is returned when the studentId does not belong to
// a registered student.
describe('examStudyProgress – INVALID_STUDENT_ID', () => {
  test('unregistered student', () => {
    const simId = setupSim();
    expect(examStudyProgress(simId, 'z9999999', 'E1-COMP1531').error).toBe('INVALID_STUDENT_ID');
  });
});

// Tests that INVALID_SIMULATION is returned when simulationId does not exist
// or when the simulation belongs to a different student.
describe('examStudyProgress – INVALID_SIMULATION', () => {
  test('non-existent simulationId', () => {
    setupSim();
    expect(examStudyProgress(99999, STUDENT_ID, 'E1-COMP1531').error).toBe('INVALID_SIMULATION');
  });
  test('simulation belongs to different student', () => {
    const simId = setupSim();
    authRegister('z6666666', PASSWORD, 'Jane', 'Doe');
    expect(examStudyProgress(simId, 'z6666666', 'E1-COMP1531').error).toBe('INVALID_SIMULATION');
  });
});

// Tests that INVALID_EXAM is returned when the examId does not exist in this simulation.
describe('examStudyProgress – INVALID_EXAM', () => {
  test('non-existent examId', () => {
    const simId = setupSim();
    expect(examStudyProgress(simId, STUDENT_ID, 'E1-FAKE0000').error).toBe('INVALID_EXAM');
  });
});

// Tests that examStudyProgress correctly returns study progress data.
// ready = true means the student has studied enough hours to pass — they still need to attempt
// the exam. This function is read-only and must not change timeElapsed or currentActivity.
describe('examStudyProgress – success cases', () => {
  test('returns all required fields', () => {
    const simId = setupSim();
    const result = examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531');
    expect(result).toHaveProperty('examId');
    expect(result).toHaveProperty('studyHoursCompleted');
    expect(result).toHaveProperty('requiredStudyHours');
    expect(result).toHaveProperty('ready');
  });
  test('returns correct examId', () => {
    const simId = setupSim();
    expect(examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531').examId).toBe('E1-COMP1531');
  });
  test('studyHoursCompleted is 0 before any studying', () => {
    const simId = setupSim();
    expect(examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531').studyHoursCompleted).toBe(0);
  });
  test('ready is false with 0 study hours', () => {
    const simId = setupSim();
    expect(examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531').ready).toBe(false);
  });
  test('studyHoursCompleted reflects prior STUDYING actions', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531').studyHoursCompleted).toBe(2);
  });
  test('ready is true when studyHoursCompleted meets requiredStudyHours exactly', () => {
    const simId = setupSim();
    // E1-COMP1531 requires 2 hours
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531').ready).toBe(true);
  });
  test('ready is true when studyHoursCompleted exceeds requiredStudyHours', () => {
    const simId = setupSim();
    // E3-COMP1531 requires 1 hour, study 2
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    const result = examStudyProgress(simId, STUDENT_ID, 'E3-COMP1531');
    expect(result.ready).toBe(true);
    expect(result.studyHoursCompleted).toBe(2);
  });
  test('study hours tracked per exam not globally', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    // E2-COMP1531 should still have 0 hours
    expect(examStudyProgress(simId, STUDENT_ID, 'E2-COMP1531').studyHoursCompleted).toBe(0);
  });
  test('does not advance timeElapsed', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    examStudyProgress(simId, STUDENT_ID, 'E1-COMP1531');
    // timeElapsed should still be 2 not 3
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).timeElapsed).toBe(3);
  });
});

// Tests all error cases for examAttemptRecord.
// Errors must be returned in this order: INVALID_STUDENT_ID, INVALID_SIMULATION,
// SIMULATION_ENDED, INVALID_EXAM, ALREADY_ATTEMPTED.
describe('examAttemptRecord – INVALID_STUDENT_ID', () => {
  test('unregistered student', () => {
    const simId = setupSim();
    expect(examAttemptRecord('E1-COMP1531', simId, 'z9999999').error).toBe('INVALID_STUDENT_ID');
  });
});

// Tests that INVALID_SIMULATION is returned when simulationId does not exist
// or when the simulation belongs to a different student.
describe('examAttemptRecord – INVALID_SIMULATION', () => {
  test('non-existent simulationId', () => {
    setupSim();
    expect(examAttemptRecord('E1-COMP1531', 99999, STUDENT_ID).error).toBe('INVALID_SIMULATION');
  });
  test('simulation belongs to different student', () => {
    const simId = setupSim();
    authRegister('z6666666', PASSWORD, 'Jane', 'Doe');
    expect(examAttemptRecord('E1-COMP1531', simId, 'z6666666').error).toBe('INVALID_SIMULATION');
  });
});

// Tests that SIMULATION_ENDED is returned when trying to attempt an exam
// on a simulation that has already GRADUATED or DROPPED_OUT.
describe('examAttemptRecord – SIMULATION_ENDED', () => {
  test('returns SIMULATION_ENDED when sim is DROPPED_OUT', () => {
    const simId = setupSim();
    // drain energy to 0
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531'); // energy → 0
    expect(examAttemptRecord('E1-COMP1531', simId, STUDENT_ID).error).toBe('SIMULATION_ENDED');
  });
});

// Tests that INVALID_EXAM is returned when the examId does not exist in this simulation.
describe('examAttemptRecord – INVALID_EXAM', () => {
  test('non-existent examId', () => {
    const simId = setupSim();
    expect(examAttemptRecord('E1-FAKE0000', simId, STUDENT_ID).error).toBe('INVALID_EXAM');
  });
});

// Tests that ALREADY_ATTEMPTED is returned when trying to attempt an exam
// that has already been attempted — each exam can only be attempted once.
describe('examAttemptRecord – ALREADY_ATTEMPTED', () => {
  test('returns ALREADY_ATTEMPTED on second attempt', () => {
    const simId = setupSim();
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(examAttemptRecord('E1-COMP1531', simId, STUDENT_ID).error).toBe('ALREADY_ATTEMPTED');
  });
});

// Tests that a successful exam attempt returns all required fields.
// examStatus must be ATTEMPTED and examOutcome must be PASS or FAIL.
describe('examAttemptRecord – return shape', () => {
  test('returns all required fields', () => {
    const simId = setupSim();
    const result = examAttemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(result).toHaveProperty('exam');
    expect(Array.isArray(result.exam)).toBe(true);
    expect(result.exam[0]).toHaveProperty('examId');
    expect(result.exam[0]).toHaveProperty('name');
    expect(result.exam[0]).toHaveProperty('examStatus');
    expect(result.exam[0]).toHaveProperty('examOutcome');
  });
  test('examId matches the attempted exam', () => {
    const simId = setupSim();
    expect(examAttemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examId).toBe('E1-COMP1531');
  });
  test('examStatus is ATTEMPTED after attempt', () => {
    const simId = setupSim();
    expect(examAttemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examStatus).toBe('ATTEMPTED');
  });
});

// Tests the pass/fail determination logic.
// PASS if studyHoursCompleted >= requiredStudyHours, FAIL otherwise.
describe('examAttemptRecord – pass/fail outcome', () => {
  test('PASS when studyHoursCompleted meets requiredStudyHours', () => {
    const simId = setupSim();
    // E1-COMP1531 requires 2 hours
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(examAttemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examOutcome).toBe('PASS');
  });
  test('FAIL when studyHoursCompleted is below requiredStudyHours', () => {
    const simId = setupSim();
    expect(examAttemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examOutcome).toBe('FAIL');
  });
  test('PASS when studyHoursCompleted exceeds requiredStudyHours', () => {
    const simId = setupSim();
    // E3-COMP1531 requires 1 hour, study 2
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    expect(examAttemptRecord('E3-COMP1531', simId, STUDENT_ID).exam[0].examOutcome).toBe('PASS');
  });
});

// Tests that taking an exam costs 30 energy points (clamped to 0).
// Taking an exam must NOT advance timeElapsed or change currentActivity.
describe('examAttemptRecord – energy cost', () => {
  test('costs 30 energy points', () => {
    const simId = setupSim();
    // initial energy = 100, after exam = 70
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID);
    // sleeping 1 hr adds 15 energy: 70 + 15 = 85
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).energy).toBe(85);
  });
  test('energy clamped to 0 if cost exceeds remaining energy', () => {
    const simId = setupSim();
    // drain energy to 10
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531'); // energy=55
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);                 // energy=70
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E2-COMP1531'); // energy=25
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);                 // energy=40
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E3-COMP1531'); // energy=10
    // exam costs 30, 10-30=-20 → clamped to 0 → DROPPED_OUT
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
  test('does not advance timeElapsed', () => {
    const simId = setupSim();
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 2); // timeElapsed = 2
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID);
    // timeElapsed should still be 2 after exam
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).timeElapsed).toBe(3);
  });
});

// Tests that course status and simulation status update correctly after exam attempts.
// Course FAILS when 2+ exams fail. Course PASSES when all attempted and 2+ pass.
// Simulation becomes DROPPED_OUT or GRADUATED immediately when conditions are met.
describe('examAttemptRecord – course and simulation status', () => {
  test('course stays IN_PROGRESS after only 1 exam attempted', () => {
    const simId = setupSim();
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID);
    // sim should still be active
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBeUndefined();
  });
  test('DROPPED_OUT when course FAILED after 2 exam failures', () => {
    const simId = setupSim();
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID); // FAIL
    examAttemptRecord('E2-COMP1531', simId, STUDENT_ID); // FAIL → course FAILED
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
  test('GRADUATED when all courses PASSED', () => {
    const simId = setupSim();
    // study enough for all 3 exams
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531'); // meets req of 2
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E2-COMP1531'); // meets req of 3
    simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    simulationApplyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531'); // meets req of 1
    examAttemptRecord('E1-COMP1531', simId, STUDENT_ID); // PASS
    examAttemptRecord('E2-COMP1531', simId, STUDENT_ID); // PASS
    examAttemptRecord('E3-COMP1531', simId, STUDENT_ID); // PASS → GRADUATED
    expect(simulationApplyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
});