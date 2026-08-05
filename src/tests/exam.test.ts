import { describe, test, expect, beforeEach } from 'vitest';
import { examStudyProgress, examAttemptRecord } from '../exam.js';
import { simulationApplyAction } from '../action.js';
import { authRegister } from '../auth.js';
import { simulationCreate } from '../simulation.js';
import { clear } from '../other.js';
import { Exam } from '../types.js';

type StudyProgressResult = Pick<Exam, 'examId' | 'studyHoursCompleted' | 'requiredStudyHours'> & {
  ready: boolean;
  error?: string;
  message?: string;
};

type AttemptResult = {
  exam: Pick<Exam, 'examId' | 'name' | 'examStatus' | 'examOutcome'>[];
  error?: string;
  message?: string;
};

type ActionCheck = {
  simulationId: number;
  currentActivity: string;
  duration: number;
  energy: number;
  happiness: number;
  timeElapsed: number;
  error?: string;
  message?: string;
};

function studyProgress(simulationId: number, studentId: string, examId: string): StudyProgressResult {
  return examStudyProgress(simulationId, studentId, examId) as StudyProgressResult;
}

function attemptRecord(examId: string, simulationId: number, studentId: string): AttemptResult {
  return examAttemptRecord(examId, simulationId, studentId) as AttemptResult;
}

function applyAction(
  studentId: string,
  simulationId: number,
  action: string,
  duration: number,
  examId?: string
): ActionCheck {
  return simulationApplyAction(studentId, simulationId, action, duration, examId) as ActionCheck;
}

const SIMPLE_UNIVERSE = {
  courses: [
    { courseId: 'COMP1531', name: 'Software Engineering Fundamentals' },
  ],
  exams: [
    { examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'Quiz 1', requiredStudyHours: 2 },
    { examId: 'E2-COMP1531', courseId: 'COMP1531', name: 'Midterm', requiredStudyHours: 3 },
    { examId: 'E3-COMP1531', courseId: 'COMP1531', name: 'Final', requiredStudyHours: 1 },
  ],
};

const STUDENT_ID = 'z5555555';
const PASSWORD = 'ValidPass1';

function setupSim(universe = SIMPLE_UNIVERSE): number {
  authRegister(STUDENT_ID, PASSWORD, 'John', 'Smith');
  const result = simulationCreate(STUDENT_ID, universe) as { simulationId: number };
  return result.simulationId;
}

beforeEach(() => {
  clear();
});

describe('examStudyProgress – INVALID_STUDENT_ID', () => {
  test('unregistered student', () => {
    const simId = setupSim();
    expect(studyProgress(simId, 'z9999999', 'E1-COMP1531').error).toBe('INVALID_STUDENT_ID');
  });
});

describe('examStudyProgress – INVALID_SIMULATION', () => {
  test('non-existent simulationId', () => {
    setupSim();
    expect(studyProgress(99999, STUDENT_ID, 'E1-COMP1531').error).toBe('INVALID_SIMULATION');
  });
  test('simulation belongs to different student', () => {
    const simId = setupSim();
    authRegister('z6666666', PASSWORD, 'Jane', 'Doe');
    expect(studyProgress(simId, 'z6666666', 'E1-COMP1531').error).toBe('INVALID_SIMULATION');
  });
});

describe('examStudyProgress – INVALID_EXAM', () => {
  test('non-existent examId', () => {
    const simId = setupSim();
    expect(studyProgress(simId, STUDENT_ID, 'E1-FAKE0000').error).toBe('INVALID_EXAM');
  });
});

describe('examStudyProgress – success cases', () => {
  test('returns all required fields', () => {
    const simId = setupSim();
    const result = studyProgress(simId, STUDENT_ID, 'E1-COMP1531');
    expect(result).toHaveProperty('examId');
    expect(result).toHaveProperty('studyHoursCompleted');
    expect(result).toHaveProperty('requiredStudyHours');
    expect(result).toHaveProperty('ready');
  });
  test('returns correct examId', () => {
    const simId = setupSim();
    expect(studyProgress(simId, STUDENT_ID, 'E1-COMP1531').examId).toBe('E1-COMP1531');
  });
  test('studyHoursCompleted is 0 before any studying', () => {
    const simId = setupSim();
    expect(studyProgress(simId, STUDENT_ID, 'E1-COMP1531').studyHoursCompleted).toBe(0);
  });
  test('ready is false with 0 study hours', () => {
    const simId = setupSim();
    expect(studyProgress(simId, STUDENT_ID, 'E1-COMP1531').ready).toBe(false);
  });
  test('studyHoursCompleted reflects prior STUDYING actions', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(studyProgress(simId, STUDENT_ID, 'E1-COMP1531').studyHoursCompleted).toBe(2);
  });
  test('ready is true when studyHoursCompleted meets requiredStudyHours exactly', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(studyProgress(simId, STUDENT_ID, 'E1-COMP1531').ready).toBe(true);
  });
  test('ready is true when studyHoursCompleted exceeds requiredStudyHours', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    const result = studyProgress(simId, STUDENT_ID, 'E3-COMP1531');
    expect(result.ready).toBe(true);
    expect(result.studyHoursCompleted).toBe(2);
  });
  test('study hours tracked per exam not globally', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(studyProgress(simId, STUDENT_ID, 'E2-COMP1531').studyHoursCompleted).toBe(0);
  });
  test('does not advance timeElapsed', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    studyProgress(simId, STUDENT_ID, 'E1-COMP1531');
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).timeElapsed).toBe(3);
  });
});

describe('examAttemptRecord – INVALID_STUDENT_ID', () => {
  test('unregistered student', () => {
    const simId = setupSim();
    expect(attemptRecord('E1-COMP1531', simId, 'z9999999').error).toBe('INVALID_STUDENT_ID');
  });
});

describe('examAttemptRecord – INVALID_SIMULATION', () => {
  test('non-existent simulationId', () => {
    setupSim();
    expect(attemptRecord('E1-COMP1531', 99999, STUDENT_ID).error).toBe('INVALID_SIMULATION');
  });
  test('simulation belongs to different student', () => {
    const simId = setupSim();
    authRegister('z6666666', PASSWORD, 'Jane', 'Doe');
    expect(attemptRecord('E1-COMP1531', simId, 'z6666666').error).toBe('INVALID_SIMULATION');
  });
});

describe('examAttemptRecord – SIMULATION_ENDED', () => {
  test('returns SIMULATION_ENDED when sim is DROPPED_OUT', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    expect(attemptRecord('E1-COMP1531', simId, STUDENT_ID).error).toBe('SIMULATION_ENDED');
  });
});

describe('examAttemptRecord – INVALID_EXAM', () => {
  test('non-existent examId', () => {
    const simId = setupSim();
    expect(attemptRecord('E1-FAKE0000', simId, STUDENT_ID).error).toBe('INVALID_EXAM');
  });
});

describe('examAttemptRecord – ALREADY_ATTEMPTED', () => {
  test('returns ALREADY_ATTEMPTED on second attempt', () => {
    const simId = setupSim();
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(attemptRecord('E1-COMP1531', simId, STUDENT_ID).error).toBe('ALREADY_ATTEMPTED');
  });
});

describe('examAttemptRecord – return shape', () => {
  test('returns all required fields', () => {
    const simId = setupSim();
    const result = attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(result).toHaveProperty('exam');
    expect(Array.isArray(result.exam)).toBe(true);
    expect(result.exam[0]).toHaveProperty('examId');
    expect(result.exam[0]).toHaveProperty('name');
    expect(result.exam[0]).toHaveProperty('examStatus');
    expect(result.exam[0]).toHaveProperty('examOutcome');
  });
  test('examId matches the attempted exam', () => {
    const simId = setupSim();
    expect(attemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examId).toBe('E1-COMP1531');
  });
  test('examStatus is ATTEMPTED after attempt', () => {
    const simId = setupSim();
    expect(attemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examStatus).toBe('ATTEMPTED');
  });
});

describe('examAttemptRecord – pass/fail outcome', () => {
  test('PASS when studyHoursCompleted meets requiredStudyHours', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    expect(attemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examOutcome).toBe('PASS');
  });
  test('FAIL when studyHoursCompleted is below requiredStudyHours', () => {
    const simId = setupSim();
    expect(attemptRecord('E1-COMP1531', simId, STUDENT_ID).exam[0].examOutcome).toBe('FAIL');
  });
  test('PASS when studyHoursCompleted exceeds requiredStudyHours', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    expect(attemptRecord('E3-COMP1531', simId, STUDENT_ID).exam[0].examOutcome).toBe('PASS');
  });
});

describe('examAttemptRecord – energy cost', () => {
  test('costs 30 energy points', () => {
    const simId = setupSim();
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).energy).toBe(85);
  });
  test('energy clamped to 0 if cost exceeds remaining energy', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E2-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E3-COMP1531');
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
  test('does not advance timeElapsed', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'SLEEPING', 2);
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).timeElapsed).toBe(3);
  });
});

describe('examAttemptRecord – course and simulation status', () => {
  test('course stays IN_PROGRESS after only 1 exam attempted', () => {
    const simId = setupSim();
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBeUndefined();
  });
  test('DROPPED_OUT when course FAILED after 2 exam failures', () => {
    const simId = setupSim();
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    attemptRecord('E2-COMP1531', simId, STUDENT_ID);
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
  test('GRADUATED when all courses PASSED', () => {
    const simId = setupSim();
    applyAction(STUDENT_ID, simId, 'STUDYING', 2, 'E1-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 3, 'E2-COMP1531');
    applyAction(STUDENT_ID, simId, 'SLEEPING', 1);
    applyAction(STUDENT_ID, simId, 'STUDYING', 1, 'E3-COMP1531');
    attemptRecord('E1-COMP1531', simId, STUDENT_ID);
    attemptRecord('E2-COMP1531', simId, STUDENT_ID);
    attemptRecord('E3-COMP1531', simId, STUDENT_ID);
    expect(applyAction(STUDENT_ID, simId, 'SLEEPING', 1).error).toBe('SIMULATION_ENDED');
  });
});
