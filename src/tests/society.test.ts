import { describe, expect, test, beforeEach } from 'vitest';
import { simulationCreate } from '../simulation.js';
import { authRegister } from '../auth.js';
import { clear } from '../other.js';
import { societyJoin, societyList, societyAttend } from '../society.js';
import { Society, Simulation } from '../types.js';

type SocietyListResult = { societies: Society[]; error?: string; message?: string };
type SocietyJoinResult = Pick<Society, 'societyId' | 'name'> & { error?: string; message?: string };
type SocietyAttendResult = Pick<Simulation, 'happiness' | 'energy'> & { error?: string; message?: string };

function listSocieties(studentId: string, simulationId: number): SocietyListResult {
  return societyList(studentId, simulationId) as SocietyListResult;
}

function joinSociety(studentId: string, simulationId: number, societyId: string): SocietyJoinResult {
  return societyJoin(studentId, simulationId, societyId) as SocietyJoinResult;
}

function attendSociety(studentId: string, simulationId: number, societyId: string, duration: number): SocietyAttendResult {
  return societyAttend(studentId, simulationId, societyId, duration) as SocietyAttendResult;
}

const customUniverse = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
    }
  ],
  societies: [
    { societyId: 'CSESOC',
      name: 'Computer Science Society',
      description: 'Society for CSE'
    },
    { societyId: 'BITSA',
      name: 'Business Information Technology Society',
      description: 'Society for Information Systems and Technologies'
    },
    { societyId: 'CATSOC',
      name: 'CATSOC UNSW',
      description: 'UNSWs Official Cat Society'
    },
  ]
};

beforeEach(() => {
  clear();
});

// Tests that societyList returns the correct error when given invalid inputs.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
describe('return errors for societyList', () => {
  test('return invalid student id', () => {
    const testSociety = listSocieties('z1234567', 1);
    expect(testSociety).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('return invalid simulation ID', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const testSociety = listSocieties(studentId, 67);
    expect(testSociety).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });
});

// Tests that societyList returns only societies the student has NOT already joined.
describe('return societyList', () => {
  test('return available societies', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    joinSociety(studentId, simulationId, 'CSESOC');
    const testSociety = listSocieties(studentId, simulationId);
    expect(testSociety).toStrictEqual({
      societies: customUniverse.societies
        .filter(society => society.societyId !== 'CSESOC')
        .map(society => ({
          societyId: society.societyId,
          name: society.name,
          description: society.description
        }))
    });
  });
});

// Tests that societyJoin returns the correct error when given invalid inputs.
// A student cannot join a society they have already joined.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY
describe('return errors for societyJoin', () => {
  test('return invalid student id', () => {
    const testSociety = joinSociety('z1234567', 1, 'CSESOC');
    expect(testSociety).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('return invalid simulation ID', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const testSociety = joinSociety(studentId, 67, 'CSESOC');
    expect(testSociety).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid society ID that does not exist', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testSociety = joinSociety(studentId, simulationId, 'FAKESOC');
    expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
  });

  test('return invalid society ID that student has already joined', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    joinSociety(studentId, simulationId, 'CSESOC');
    const testSociety = joinSociety(studentId, simulationId, 'CSESOC');
    expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
  });
});

// Tests that societyJoin returns the societyId and name on a successful join.
describe('return valid societyJoin', () => {
  test('return the society that the student has joined', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const society1 = customUniverse.societies[0];
    const testSociety = joinSociety(studentId, simulationId, society1.societyId);
    expect(testSociety).toStrictEqual({
      societyId: society1.societyId,
      name: society1.name,
    });
  });
});

// Tests that societyAttend returns the correct error when given invalid inputs.
// Student must have joined the society before attending.
// Duration must be between 1 and 4 hours inclusive.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY, INVALID_DURATION
describe('return errors for societyAttend', () => {
  test('return invalid student id', () => {
    const testSociety = attendSociety('z1234567', 1, 'CSESOC', 1);
    expect(testSociety).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('return invalid simulation ID', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const testSociety = attendSociety(studentId, 67, 'CSESOC', 1);
    expect(testSociety).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid society ID that does not exist', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testSociety = attendSociety(studentId, simulationId, 'FAKESOC', 1);
    expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
  });

  test('return invalid society ID that student has not joined', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testSociety = attendSociety(studentId, simulationId, 'CSESOC', 1);
    expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
  });

  test('return invalid duration for duration of 0 hours', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    joinSociety(studentId, simulationId, 'CSESOC');
    const testSociety = attendSociety(studentId, simulationId, 'CSESOC', 0);
    expect(testSociety).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
  });

  test('return invalid duration for duration of greater than 5 hours', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    joinSociety(studentId, simulationId, 'CSESOC');
    const testSociety = attendSociety(studentId, simulationId, 'CSESOC', 5);
    expect(testSociety).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
  });
});

// Tests that societyAttend correctly updates happiness and energy after attending.
// Attending costs 5 energy per hour and gains 10 happiness per hour.
describe('return valid attendance of a society', () => {
  test('return the society that the student has joined', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    joinSociety(studentId, simulationId, 'CSESOC');
    const testSociety = attendSociety(studentId, simulationId, 'CSESOC', 3);
    expect(testSociety).toStrictEqual({
      happiness: 80,
      energy: 85,
    });
  });
});
