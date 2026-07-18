import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.ts';
import { checkWinLoseConditions, clampStat } from './action.ts';
import { Result, Simulation, Society } from './types.ts';

// Stat effects per hour for attending a society event
// Attending increases happiness but costs energy
const societyAction = {
  ATTENDING: {
    happinessPerHour: 10,
    energyPerHour: -5
  }
};

// Finds a society by societyId within a simulation's universe data.
// Returns the society object if found, or an INVALID_SOCIETY error object if not.
function findSocietyOrError(
  simulation: Simulation,
  societyId: string
): Result<Society> {
  const society = simulation.universeData.societies.find(soc => soc.societyId === societyId);
  if (!society) {
    return { error: 'INVALID_SOCIETY', message: 'Society ID does not exist' };
  }
  return society;
}

// Returns true if the student has already joined the given society in this simulation.
// Since we are in a simulation, studentId is not a necessary parameter
function hasJoinedSociety(
  simulation: Simulation,
  societyId: string)
  : boolean {
  return simulation.joinedSocieties.includes(societyId);
}

// Returns a list of all societies available to join in this simulation.
// Only shows societies the student has NOT already joined.
// Returns { societies: [{ societyId, name, description }] }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
function societyList(
  studentId: string,
  simulationId: number
): Result<{
  societies: {
    societyId: string;
    name: string;
    description: string }[]
  }> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const availableSocieties = simulation.universeData.societies
    .filter(society => !hasJoinedSociety(simulation, society.societyId))
    .map(society => ({
      societyId: society.societyId,
      name: society.name,
      description: society.description
    }));

  return { societies: availableSocieties };
}


// Joins a society in the simulation — student can only join each society once.
// Returns { societyId, name } on success.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY
function societyJoin(
  studentId: string,
  simulationId: number,
  societyId: string
): Result<{
  societyId: string;
  name: string
}> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const society = findSocietyOrError(simulation, societyId);
  if (isError(society)) return society;

  if (hasJoinedSociety(simulation, societyId)) {
    return { error: 'INVALID_SOCIETY', message: 'Student has already joined this society' };
  }

  simulation.joinedSocieties.push(societyId);

  return {
    societyId: society.societyId,
    name: society.name,
  };
}

// Attends a society event for a given duration (1-4 hours).
// Attending costs energy (-5/hr) and increases happiness (+10/hr).
// Advances timeElapsed and sets currentActivity to ATTENDING_SOCIETY.
// Checks win/lose conditions immediately after attending.
// Returns { happiness, energy } on success.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_SOCIETY, INVALID_DURATION
function societyAttend(
  studentId: string,
  simulationId: number,
  societyId: string,
  duration: number
): Result<{
  happiness: number;
  energy: number
}> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const society = findSocietyOrError(simulation, societyId);
  if (isError(society)) return society;

  if (!hasJoinedSociety(simulation, societyId)) {
    return { error: 'INVALID_SOCIETY', message: 'Student has not joined this society' };
  }

  if (duration <= 0 || duration > 4) {
    return { error: 'INVALID_DURATION', message: 'Student cannot attend for this specified duration' };
  }

  const effects = societyAction.ATTENDING;
  simulation.happiness = clampStat(simulation.happiness + effects.happinessPerHour * duration);
  simulation.energy = clampStat(simulation.energy + effects.energyPerHour * duration);
  simulation.timeElapsed += duration;
  simulation.currentActivity = 'ATTENDING_SOCIETY';

  checkWinLoseConditions(simulation);

  return {
    happiness: simulation.happiness,
    energy: simulation.energy,
  };
}

export { societyList, societyJoin, societyAttend };