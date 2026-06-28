  import { describe, expect, test, beforeEach } from 'vitest';
  import { simulationCreate, simulationStatus, simulationsList } from './simulation.js'
  import { authRegister } from './auth.js';
  import { clear } from './other.js';
  import { societyJoin, societyList, societyAttend } from './society.js';

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

  describe('return errors for societyList', () => {
    test('return invalid student id', () => {
      const testSociety = societyList('z1234567', 1);
      expect(testSociety).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    });

    test('return invalid simulation ID', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const testSociety = societyList(studentId, 67);
      expect(testSociety).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });
  });

  describe('return societyList', () => {
    test('return available societies', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      societyJoin(studentId, simulationId, 'CSESOC');
      const testSociety = societyList(studentId, simulationId);
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

  describe('return errors for societyJoin', () => {
    test('return invalid student id', () => {
      const testSociety = societyJoin('z1234567', 1, 'CSESOC');
      expect(testSociety).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    });

    test('return invalid simulation ID', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const testSociety = societyJoin(studentId, 67, 'CSESOC');
      expect(testSociety).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return invalid society ID that does not exist', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testSociety = societyJoin(studentId, simulationId, 'FAKESOC');
      expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    });

    test('return invalid society ID that student has already joined', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      societyJoin(studentId, simulationId, 'CSESOC');
      const testSociety = societyJoin(studentId, simulationId, 'CSESOC');
      expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    });
  });

  describe('return valid societyJoin', () => {
    test('return the society that the student has joined', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const society1 = customUniverse.societies[0];
      const testSociety = societyJoin(studentId, simulationId, society1.societyId);
      expect(testSociety).toStrictEqual({
        societyId: society1.societyId,
        name: society1.name,
      });
    });
  });

  describe('return errors for societyAttend', () => {
    test('return invalid student id', () => {
      const testSociety = societyAttend('z1234567', 1, 'CSESOC', 1);
      expect(testSociety).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    });

    test('return invalid simulation ID', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const testSociety = societyAttend(studentId, 67, 'CSESOC', 1);
      expect(testSociety).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return invalid society ID that does not exist', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testSociety = societyAttend(studentId, simulationId, 'FAKESOC', 1);
      expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    });

    test('return invalid society ID that student has not joined', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testSociety = societyAttend(studentId, simulationId, 'CSESOC', 1);
      expect(testSociety).toStrictEqual({ error: 'INVALID_SOCIETY', message: expect.any(String) });
    });

    test('return invalid duration for duration of 0 hours', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      societyJoin(studentId, simulationId, 'CSESOC');
      const testSociety = societyAttend(studentId, simulationId, 'CSESOC', 0);
      expect(testSociety).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
    });

    test('return invalid duration for duration of greater than 5 hours', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      societyJoin(studentId, simulationId, 'CSESOC');
      const testSociety = societyAttend(studentId, simulationId, 'CSESOC', 5);
      expect(testSociety).toStrictEqual({ error: 'INVALID_DURATION', message: expect.any(String) });
    });
  });

  describe('return valid attendance of a society', () => {
    test('return the society that the student has joined', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      societyJoin(studentId, simulationId, 'CSESOC');
      const testSociety = societyAttend(studentId, simulationId, 'CSESOC', 3);;
      expect(testSociety).toStrictEqual({
        happiness: 80,
        energy: 85,
      });
    });
  });
