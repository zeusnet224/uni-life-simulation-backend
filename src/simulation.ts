import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.ts';
import { checkWinLoseConditions } from './action.ts';
import { getData } from './dataStore.ts';
import { Result, Simulation, UniverseData, SimulationStatus } from './types.ts';

// Creates a new simulation instance for a registered student with the given universe data.
// Sets initial stats: energy=100, happiness=50, timeElapsed=0, currentActivity=DOOM_SCROLLING.
// Returns { simulationId } on success.
// Errors: INVALID_STUDENT_ID, INVALID_UNIVERSE
function simulationCreate(
  studentId: string,
  universeData: object
): Result<{simulationId: number}> {
  const data = getData();

  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  if (universeData === null || typeof universeData !== 'object' || Array.isArray(universeData)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must be an object' };
  }

  const universe = universeData as UniverseData & { error?: string; message?: string };

  if (universe.error) {
    return { error: 'INVALID_UNIVERSE', message: universe.message || 'Universe data is invalid' };
  }

  if (!Array.isArray(universe.courses)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must contain a courses array' };
  }

  const exams = Array.isArray(universe.exams) ? universe.exams : [];

  const simulationId = data.simulations.reduce((maxId, simulation) => {
    return Math.max(maxId, simulation.simulationId);
  }, 0) + 1;

  data.simulations.push({
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
      ...universe,
      courses: universe.courses.map(course => ({
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
    },
  });

  return { simulationId };
}

// Returns the current status and stats of a specific simulation.
// Also checks win/lose conditions and updates simulationStatus if needed.
// Returns { simulationStatus, currentActivity, energy, happiness, timeElapsed }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
function simulationStatus(
  studentId: string,
  simulationId: number
): Result<{
  simulationStatus: SimulationStatus;
  currentActivity: string;
  energy: number;
  happiness: number;
  timeElapsed: number;
}> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  // Reuse the shared win/lose check instead of duplicating the logic here
  checkWinLoseConditions(simulation);

  return {
    simulationStatus: simulation.simulationStatus,
    currentActivity: simulation.currentActivity,
    energy: simulation.energy,
    happiness: simulation.happiness,
    timeElapsed: simulation.timeElapsed,
  };
}

// Returns a summary list of all simulation instances belonging to a given student.
// Each simulation includes simulationId, simulationStatus, currentActivity, timeElapsed.
// Returns { simulations: [{ simulationId, simulationStatus, currentActivity, timeElapsed }] }
// Errors: INVALID_STUDENT_ID
function simulationsList(studentId: string): Result<{
  simulations: {
    simulationId: number;
    simulationStatus: SimulationStatus;
    currentActivity: string;
    timeElapsed: number;
  }[];
}> {
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

// Identifies which exam was being studied for in the most recent action, if any.
// Returns { examId, name, duration } if the last action was STUDYING.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, NO_STUDY_ACTION
function examGetStudyAction(
  studentId: string,
  simulationId: number
): Result<{
  examId: string;
  name: string;
  duration: number
 }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const lastAction = simulation.actionHistory[simulation.actionHistory.length - 1];
  if (!lastAction || lastAction.action !== 'STUDYING') {
    return { error: 'NO_STUDY_ACTION', message: 'The most recent action was not a STUDYING action' };
  }

  const exam = simulation.universeData.exams.find(e => e.examId === lastAction.examId);

  return {
    examId: exam!.examId,
    name: exam!.name,
    duration: lastAction.duration,
  };
}

// Determines which action was most recently applied and how long it lasted.
// Returns { currentActivity, duration, timeElapsed }.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, NO_ACTION_PERFORMED
function simulationGetLastAction(
  studentId: string,
  simulationId: number
): Result<{
  currentActivity: string;
  duration: number;
  timeElapsed: number
}> {
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

// Signals whether a simulation has ended and no further actions should be applied.
// Returns { simulationStatus, notification } once GRADUATED or DROPPED_OUT.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, SIMULATION_NOT_ENDED
function simulationGetConcludingNotification(
  studentId: string,
  simulationId: number
): Result<{
  simulationStatus: SimulationStatus;
  notification: string
 }> {
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

export {
  simulationCreate,
  simulationStatus,
  simulationsList,
  examGetStudyAction,
  simulationGetLastAction,
  simulationGetConcludingNotification,
};