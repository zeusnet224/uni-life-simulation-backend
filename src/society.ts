import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { checkWinLoseConditions, clampStat } from './action.js';
import { Simulation, Society, Result } from './types.js';

const societyAction = {
  ATTENDING: { happinessPerHour: 10, energyPerHour: -5 }
};

function findSocietyOrError(simulation: Simulation, societyId: string): Result<Society> {
  const society = simulation.universeData.societies.find(soc => soc.societyId === societyId);
  if (!society) {
    return { error: 'INVALID_SOCIETY', message: 'Society ID does not exist' };
  }
  return society;
}

function hasJoinedSociety(simulation: Simulation, societyId: string): boolean {
  return simulation.joinedSocieties.includes(societyId);
}

export function societyList(
  studentId: string,
  simulationId: number
): Result<{ societies: Society[] }> {
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

export function societyJoin(
  studentId: string,
  simulationId: number,
  societyId: string
): Result<Pick<Society, 'societyId' | 'name'>> {
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

export function societyAttend(
  studentId: string,
  simulationId: number,
  societyId: string,
  duration: number
): Result<Pick<Simulation, 'happiness' | 'energy'>> {
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
