import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { checkWinLoseConditions } from './action.js';
import { getData, saveData } from './dataStore.js';
import { Simulation, Exam, UniverseData, Result, ErrorResponse } from './types.js';

function isRawErrorObject(value: unknown): value is ErrorResponse {
  return value !== null && typeof value === 'object' && 'error' in value;
}

export function simulationCreate(
  studentId: string,
  universeData: unknown
): Result<Pick<Simulation, 'simulationId'>> {
  const data = getData();

  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  if (universeData === null || typeof universeData !== 'object' || Array.isArray(universeData)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must be an object' };
  }

  if (isRawErrorObject(universeData)) {
    return { error: 'INVALID_UNIVERSE', message: universeData.message || 'Universe data is invalid' };
  }

  const rawUniverse = universeData as Partial<UniverseData>;

  if (!Array.isArray(rawUniverse.courses)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must contain a courses array' };
  }

  const exams = Array.isArray(rawUniverse.exams) ? rawUniverse.exams : [];
  const societies = Array.isArray(rawUniverse.societies) ? rawUniverse.societies : [];

  const simulationId = data.simulations.reduce((maxId, simulation) => {
    return Math.max(maxId, simulation.simulationId);
  }, 0) + 1;

  const newSimulation: Simulation = {
    simulationId,
    studentId,
    simulationStatus: 'ACTIVE',
    currentActivity: 'DOOM_SCROLLING',
    energy: 100,
    happiness: 50,
    timeElapsed: 0,
    actionHistory: [],
    joinedSocieties: [],
    universeData: {
      courses: rawUniverse.courses.map(course => ({
        ...course,
        courseStatus: course.courseStatus || 'ACTIVE',
      })),
      exams: exams.map(exam => ({
        ...exam,
        studyHoursCompleted: exam.studyHoursCompleted || 0,
        studyProgress: exam.studyProgress || 0,
        examStatus: exam.examStatus || 'NOT_ATTEMPTED',
        examScore: exam.examScore || 0,
        examOutcome: exam.examOutcome || 'NIL',
      })),
      societies,
    },
  };

  data.simulations.push(newSimulation);

  saveData();

  return { simulationId };
}

export function simulationStatus(
  studentId: string,
  simulationId: number
): Result<Pick<Simulation, 'simulationStatus' | 'currentActivity' | 'energy' | 'happiness' | 'timeElapsed'>> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  checkWinLoseConditions(simulation);

  return {
    simulationStatus: simulation.simulationStatus,
    currentActivity: simulation.currentActivity,
    energy: simulation.energy,
    happiness: simulation.happiness,
    timeElapsed: simulation.timeElapsed,
  };
}

export function simulationsList(
  studentId: string
): Result<{ simulations: Pick<Simulation, 'simulationId' | 'simulationStatus' | 'currentActivity' | 'timeElapsed'>[] }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const data = getData();
  const studentSimulations = data.simulations
    .filter(sim => sim.studentId === studentId)
    .map(sim => ({
      simulationId: sim.simulationId,
      simulationStatus: sim.simulationStatus,
      currentActivity: sim.currentActivity,
      timeElapsed: sim.timeElapsed,
    }));

  return { simulations: studentSimulations };
}

export function examGetStudyAction(
  studentId: string,
  simulationId: number
): Result<Pick<Exam, 'examId' | 'name'> & { duration: number }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const lastAction = simulation.actionHistory[simulation.actionHistory.length - 1];
  if (!lastAction || lastAction.action !== 'STUDYING') {
    return { error: 'NO_STUDY_ACTION', message: 'The most recent action was not a STUDYING action' };
  }

  const exam = simulation.universeData.exams.find(e => e.examId === lastAction.examId);
  if (!exam) {
    return { error: 'NO_STUDY_ACTION', message: 'The studied exam could not be found' };
  }

  return {
    examId: exam.examId,
    name: exam.name,
    duration: lastAction.duration,
  };
}

export function simulationGetLastAction(
  studentId: string,
  simulationId: number
): Result<Pick<Simulation, 'currentActivity' | 'timeElapsed'> & { duration: number }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const lastAction = simulation.actionHistory[simulation.actionHistory.length - 1];
  if (!lastAction) {
    return { error: 'NO_ACTION_PERFORMED', message: 'No actions have been performed on this simulation yet' };
  }

  return {
    currentActivity: lastAction.action,
    duration: lastAction.duration,
    timeElapsed: simulation.timeElapsed,
  };
}

export function simulationGetConcludingNotification(
  studentId: string,
  simulationId: number
): Result<Pick<Simulation, 'simulationStatus'> & { notification: string }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  checkWinLoseConditions(simulation);

  if (simulation.simulationStatus === 'ACTIVE') {
    return { error: 'SIMULATION_NOT_ENDED', message: 'This simulation is still active' };
  }

  const notification = simulation.simulationStatus === 'GRADUATED'
    ? 'Congratulations, this simulation has GRADUATED. No further actions can be applied.'
    : 'This simulation has DROPPED_OUT. No further actions can be applied.';

  return {
    simulationStatus: simulation.simulationStatus,
    notification,
  };
}
