import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { Result } from './types.js';

export type ReadinessLabel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExamReadinessResult {
  examId: string;
  readiness: ReadinessLabel;
  reasons: string[];
}

const STUDY_PROGRESS_THRESHOLD = 0.75;
const WELLBEING_HAPPINESS_THRESHOLD = 50;
const WELLBEING_ENERGY_THRESHOLD = 50;

export function examReadiness(
  studentId: string,
  simulationId: number,
  examId: string
): Result<ExamReadinessResult> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const exam = simulation.universeData.exams.find(e => e.examId === examId);
  if (!exam) {
    return { error: 'INVALID_EXAM', message: 'Exam ID does not exist in this simulation' };
  }

  const reasons: string[] = [];

  const studyProgressRatio = exam.requiredStudyHours > 0
    ? exam.studyHoursCompleted / exam.requiredStudyHours
    : 1;
  const studyMet = studyProgressRatio >= STUDY_PROGRESS_THRESHOLD;
  reasons.push(
    studyMet
      ? `Completed ${exam.studyHoursCompleted}/${exam.requiredStudyHours} study hours (>= 75% required) boosts readiness`
      : `Only completed ${exam.studyHoursCompleted}/${exam.requiredStudyHours} study hours (< 75% required) reduces readiness`
  );

  const wellbeingMet = simulation.happiness >= WELLBEING_HAPPINESS_THRESHOLD && simulation.energy >= WELLBEING_ENERGY_THRESHOLD;
  reasons.push(
    wellbeingMet
      ? `Wellbeing is stable (happiness ${simulation.happiness}, energy ${simulation.energy}, both >= 50) boosts readiness`
      : `Wellbeing is low (happiness ${simulation.happiness}, energy ${simulation.energy}) reduces readiness`
  );

  const opportunityMet = simulation.joinedOpportunities.length > 0;
  reasons.push(
    opportunityMet
      ? `Joined ${simulation.joinedOpportunities.length} extracurricular opportunity(ies) boosts readiness`
      : 'No extracurricular opportunities joined reduces readiness'
  );

  const factorsMet = [studyMet, wellbeingMet, opportunityMet].filter(Boolean).length;
  let readiness: ReadinessLabel;
  if (factorsMet === 3) {
    readiness = 'HIGH';
  } else if (factorsMet === 2) {
    readiness = 'MEDIUM';
  } else {
    readiness = 'LOW';
  }

  return { examId, readiness, reasons };
}
