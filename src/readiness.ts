import { AcademicReadiness, ExamReadiness, Result } from './types.js';
import { getData } from './dataStore.js';
import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';

export function calcAcademicReadiness(
  studentId: string,
  simulationId: number,
  examId: string
): Result<ExamReadiness> {
  const student = findStudentOrError(studentId);
  if (isError(student)) {
    return student;
  }

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) {
    return simulation;
  }

  const exam = simulation.universeData.exams.find(e => e.examId === examId);
  if (!exam) {
    return { error: 'INVALID_EXAM', message: 'Exam ID does not exist' };
  }

  let componentsCounter = 0;
  const reasons: string[] = [];

  // Component 1: Calculate hours studied against study hours required. If studied hours completed
  // is 75% if requiredStudyHours, then the component is satisfied.
  if (
    exam.requiredStudyHours > 0
    && exam.studyHoursCompleted >= exam.requiredStudyHours * 0.75
  ) {
    componentsCounter++;
    reasons.push(
      'Has studied 75% of the study hours required. Keep up the good work!'
    );
  } else {
    reasons.push(
      'Studied less than 75% of the required study hours. Lets try to study hard so we can get ready for the exam!'
    );
  }

  const data = getData();

  // Component 2: Calculates the amount of social connections and if their closeness is greater than
  // or equal to 3. If has more than 2 close connections, then component is satisfied.
  const closeConnections = data.socialConnections.filter(
    connection =>
      connection.simulationId === simulation.simulationId
      && connection.closeness >= 3
  );

  if (closeConnections.length >= 2) {
    componentsCounter++;
    reasons.push(
      'Has a support network with more than two close connections. Having study buddies always boosts readiness for the exam!'
    );
  } else {
    reasons.push(
      'Fewer than two close connections. Try finding people to study for the exam with to boost your readiness for the exam!'
    );
  }

  // Component 3: If the student has joined an extracurricular, then component is satisfied.
  if (simulation.joinedOpportunities.length > 0) {
    componentsCounter++;
    reasons.push(
      'Has joined an extracurricular opportunity. A good work-life balance always boosts readiness for the exam!'
    );
  } else {
    reasons.push(
      'Has not joined an extracurricular opportunity. A good work-life balance can boost readiness for the exam, so try joining an extracurricular!'
    );
  }

  let readiness: AcademicReadiness;

  if (componentsCounter === 3) {
    readiness = 'HIGH';
  } else if (componentsCounter === 2) {
    readiness = 'MEDIUM';
  } else {
    readiness = 'LOW';
  }

  return {
    readiness,
    reasons,
  };
}
