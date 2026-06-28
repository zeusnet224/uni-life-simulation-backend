  import { describe, expect, test, beforeEach } from 'vitest';
  import { clearData } from './dataStore.js';
  import {
    courseRetrieveCourses,
    courseRetrieveExams,
    courseRetrieveCourseDetails,
    courseRetrieveExamDetails,
    courseCompletion,
  } from './course.js';
  import { authRegister } from './auth.js';
  import { simulationCreate } from './simulation.js';

  const customUniverse = {
    courses: [
      {
        courseId: 'COMP1531',
        name: 'Software Engineering Fundamentals',
        courseDetails: 'COMP1531 course details',
        courseStatus: 'FAILED',
      }
    ],
    exams : [
      {
        examId: 'E1-COMP1531',
        courseId: 'COMP1531',
        name: 'Exam 1 For COMP1531',
        requiredStudyHours: 1,
      }
    ]
  };

  beforeEach(() => {
    clearData();
  });

  describe('courseRetrieveCourses', () => {
    test('return invalid simulation error', () => {
      const testCourse = courseRetrieveCourses(5000)
      expect(testCourse).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return valid courses', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testCourse = courseRetrieveCourses(simulationId);
      expect(testCourse).toStrictEqual({
        courses: customUniverse.courses.map(course => ({
          courseId: course.courseId,
          name: course.name
        }))
      });
    });
  });

  describe('courseRetrieveExams', () => {
    test('return invalid simulation error', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      simulationCreate(studentId, customUniverse);
      const testExams = courseRetrieveExams(5000)
      expect(testExams).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return valid exams', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testExams = courseRetrieveExams(simulationId);
      expect(testExams).toStrictEqual({
        exams: customUniverse.exams.map(exam => ({
          examId: exam.examId,
          courseId: exam.courseId,
          name: exam.name,
          requiredStudyHours: exam.requiredStudyHours
        }))
      });
    });
  });

  describe('courseRetrieveCourseDetails', () => {
    test('return invalid stimulation error', () => {
      const testCourse = courseRetrieveCourseDetails('COMP1531', 67);
      expect(testCourse).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return invalid course error', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testCourse = courseRetrieveCourseDetails('MATH1081', simulationId);
      expect(testCourse).toStrictEqual({ error: 'INVALID_COURSE', message: expect.any(String) });
    });

    test('return valid course details', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const course1 = customUniverse.courses[0];
      const testCourse = courseRetrieveCourseDetails(course1.courseId, simulationId);
      expect(testCourse).toStrictEqual({
        course: [
          {
              courseId: course1.courseId,
              name: course1.name,
              courseDetails: course1.courseDetails,
              courseStatus: course1.courseStatus
          }
        ]
      });
    });
  });

  describe('courseRetrieveExamDetails', () => {
    test('return invalid stimulation error', () => {
      const testExam = courseRetrieveExamDetails(1, 'E1-COMP1531');
      expect(testExam).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return invalid exam error', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testExam = courseRetrieveExamDetails(simulationId, 'TROLLEXAM');
      expect(testExam).toStrictEqual({ error: 'INVALID_EXAM', message: expect.any(String) });
    });

    test('return valid exam details', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const exam1 = customUniverse.exams[0];
      const testExam = courseRetrieveExamDetails(simulationId, exam1.examId);
      expect(testExam).toStrictEqual({
        exam: [
          {
              examId: exam1.examId,
              courseId: exam1.courseId,
              name: exam1.name,
              requiredStudyHours: exam1.requiredStudyHours
          }
        ]
      });
    });
  });

  describe('courseCompletion', () => {
    test('return invalid student id error', () => {
      const testCourse = courseCompletion('COMP1531', 'z1111111', 1);
      expect(testCourse).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
    });

    test('return invalid stimulation error', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const testCourse = courseCompletion('COMP1531', studentId, 67);
      expect(testCourse).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
    });

    test('return invalid course error', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const testCourse = courseCompletion('MATH1081', studentId, simulationId);
      expect(testCourse).toStrictEqual({ error: 'INVALID_COURSE', message: expect.any(String) });
    });

    test('return course completion', () => {
      const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith');
      const { simulationId } = simulationCreate(studentId, customUniverse);
      const course1 = customUniverse.courses[0];
      const testCourse = courseCompletion(course1.courseId, studentId, simulationId);
      expect(testCourse).toStrictEqual({
        course: [
          {
              courseId: course1.courseId,
              courseStatus: course1.courseStatus,
          }
        ]
      });
    });
  });