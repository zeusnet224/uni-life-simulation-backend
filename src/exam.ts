import { checkWinLoseConditions } from './action.js';
import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { Result } from './types.js';

interface ExamStudyProgressResult {
  examId: string;
  studyHoursCompleted: number;
  requiredStudyHours: number;
  ready: boolean;
}

interface ExamAttemptResult {
  exam: {
    examId: string;
    name: string;
    examStatus: string;
    examOutcome: string;
  }[];
}

// Returns the study progress for a specific exam in a simulation.
// This is a read-only function — it does not change timeElapsed or currentActivity.
// Parameters: simulationId, studentId, examId
// Returns: { examId, studyHoursCompleted, requiredStudyHours, ready }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_EXAM
function examStudyProgress(
  simulationId: number,
  studentId: string,
  examId: string
): Result<ExamStudyProgressResult> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const exam = simulation.universeData.exams.find(e => e.examId === examId);
  if (!exam) {
    return { error: 'INVALID_EXAM', message: 'Exam ID does not exist' };
  }

  return {
    examId:              exam.examId,
    studyHoursCompleted: exam.studyHoursCompleted,
    requiredStudyHours:  exam.requiredStudyHours,
    ready: exam.studyHoursCompleted >= exam.requiredStudyHours,
  };
}

// Records an exam attempt, applies the 30 energy cost, determines pass/fail,
// updates course status, and checks win/lose conditions immediately.
// Pass condition: studyHoursCompleted >= requiredStudyHours
// Taking an exam does NOT advance timeElapsed or change currentActivity.
// Parameters: examId, simulationId, studentId
// Returns: { exam: [{ examId, name, examStatus, examOutcome }] }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, SIMULATION_ENDED, INVALID_EXAM, ALREADY_ATTEMPTED
function examAttemptRecord(
  examId: string,
  simulationId: number,
  studentId: string
): Result<ExamAttemptResult> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  // Exams can only be attempted while the simulation is still active
  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'SIMULATION_ENDED', message: 'Cannot attempt exams in a completed simulation' };
  }

  const exam = simulation.universeData.exams.find(e => e.examId === examId);
  if (!exam) {
    return { error: 'INVALID_EXAM', message: 'Exam ID does not exist' };
  }

  // Each exam can only be attempted once
  if (exam.examStatus === 'ATTEMPTED') {
    return { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this exam' };
  }

  // Taking an exam costs 30 energy, clamped to a minimum of 0
  simulation.energy = simulation.energy - 30;
  if (simulation.energy < 0) {
    simulation.energy = 0;
  }

  // Pass if enough study hours were completed, fail otherwise
  exam.examStatus = 'ATTEMPTED';
  if (exam.studyHoursCompleted >= exam.requiredStudyHours) {
    exam.examOutcome = 'PASS';
  } else {
    exam.examOutcome = 'FAIL';
  }

  // Recalculate this exam's course status based on all exams in that course
  const courseExams = simulation.universeData.exams.filter(e => e.courseId === exam.courseId);
  const course = simulation.universeData.courses.find(c => c.courseId === exam.courseId);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalAttempted = 0;

  for (const e of courseExams) {
    if (e.examOutcome === 'PASS') totalPassed++;
    if (e.examOutcome === 'FAIL') totalFailed++;
    if (e.examStatus === 'ATTEMPTED') totalAttempted++;
  }

  if (course) {
    // 2 or more failed exams means the course cannot be recovered
    if (totalFailed >= 2) {
      course.courseStatus = 'FAILED';
    } else if (totalAttempted === courseExams.length && totalPassed >= 2) {
      // Every exam attempted, and at least 2 passed, means the course is complete
      course.courseStatus = 'PASSED';
    }
  }

  // Check whether this exam result has caused the simulation to graduate or drop out
  checkWinLoseConditions(simulation);

  return {
    exam: [
      {
        examId:      exam.examId,
        name:        exam.name,
        examStatus:  exam.examStatus,
        examOutcome: exam.examOutcome,
      }
    ]
  };
}

export { examStudyProgress, examAttemptRecord };