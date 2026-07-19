import { describe, expect, test, beforeEach } from 'vitest';
import { clear } from '../other.js';
import {
  courseRetrieveCourses,
  courseRetrieveExams,
  courseRetrieveCourseDetails,
  courseRetrieveExamDetails,
  courseCompletion,
} from '../course.js';
import { authRegister } from '../auth.js';
import { simulationCreate } from '../simulation.js';
import { Course, Exam } from '../types.js';

type CoursesResult = { courses: Pick<Course, 'courseId' | 'name'>[]; error?: string; message?: string };
type ExamsResult = { exams: Pick<Exam, 'examId' | 'courseId' | 'name' | 'requiredStudyHours'>[]; error?: string; message?: string };
type CourseDetailsResult = { course: Pick<Course, 'courseId' | 'name' | 'courseDetails' | 'courseStatus'>[]; error?: string; message?: string };
type ExamDetailsResult = { exam: Pick<Exam, 'examId' | 'courseId' | 'name' | 'requiredStudyHours'>[]; error?: string; message?: string };
type CourseCompletionResult = { course: Pick<Course, 'courseId' | 'courseStatus'>[]; error?: string; message?: string };

function retrieveCourses(simulationId: number): CoursesResult {
  return courseRetrieveCourses(simulationId) as CoursesResult;
}

function retrieveExams(simulationId: number): ExamsResult {
  return courseRetrieveExams(simulationId) as ExamsResult;
}

function retrieveCourseDetails(courseId: string, simulationId: number): CourseDetailsResult {
  return courseRetrieveCourseDetails(courseId, simulationId) as CourseDetailsResult;
}

function retrieveExamDetails(simulationId: number, examId: string): ExamDetailsResult {
  return courseRetrieveExamDetails(simulationId, examId) as ExamDetailsResult;
}

function completion(courseId: string, studentId: string, simulationId: number): CourseCompletionResult {
  return courseCompletion(courseId, studentId, simulationId) as CourseCompletionResult;
}

const customUniverse = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
      courseDetails: 'COMP1531 course details',
      courseStatus: 'FAILED',
    }
  ],
  exams: [
    {
      examId: 'E1-COMP1531',
      courseId: 'COMP1531',
      name: 'Exam 1 For COMP1531',
      requiredStudyHours: 1,
    }
  ]
};

beforeEach(() => {
  clear();
});

describe('courseRetrieveCourses', () => {
  test('return invalid simulation error', () => {
    const testCourse = retrieveCourses(5000);
    expect(testCourse).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return valid courses', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testCourse = retrieveCourses(simulationId);
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
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    simulationCreate(studentId, customUniverse);
    const testExams = retrieveExams(5000);
    expect(testExams).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return valid exams', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testExams = retrieveExams(simulationId);
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
    const testCourse = retrieveCourseDetails('COMP1531', 67);
    expect(testCourse).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid course error', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testCourse = retrieveCourseDetails('MATH1081', simulationId);
    expect(testCourse).toStrictEqual({ error: 'INVALID_COURSE', message: expect.any(String) });
  });

  test('return valid course details', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const course1 = customUniverse.courses[0];
    const testCourse = retrieveCourseDetails(course1.courseId, simulationId);
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
    const testExam = retrieveExamDetails(1, 'E1-COMP1531');
    expect(testExam).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid exam error', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testExam = retrieveExamDetails(simulationId, 'TROLLEXAM');
    expect(testExam).toStrictEqual({ error: 'INVALID_EXAM', message: expect.any(String) });
  });

  test('return valid exam details', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const exam1 = customUniverse.exams[0];
    const testExam = retrieveExamDetails(simulationId, exam1.examId);
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
    const testCourse = completion('COMP1531', 'z1111111', 1);
    expect(testCourse).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('return invalid stimulation error', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const testCourse = completion('COMP1531', studentId, 67);
    expect(testCourse).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid course error', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const testCourse = completion('MATH1081', studentId, simulationId);
    expect(testCourse).toStrictEqual({ error: 'INVALID_COURSE', message: expect.any(String) });
  });

  test('return course completion', () => {
    const { studentId } = authRegister('z1234567', 'ILoveComp1531', 'John', 'Smith') as { studentId: string };
    const { simulationId } = simulationCreate(studentId, customUniverse) as { simulationId: number };
    const course1 = customUniverse.courses[0];
    const testCourse = completion(course1.courseId, studentId, simulationId);
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
