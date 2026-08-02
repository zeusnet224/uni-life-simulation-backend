import { getData } from './dataStore.js';
import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { checkWinLoseConditions, clampStat } from './action.js';
import { Simulation, SocialConnection, Opportunity, Result } from './types.js';

export const HANG_OUT = 'HANG_OUT';
export const ATTEND_CLUB_EVENT = 'ATTEND_CLUB_EVENT';

// Per-hour stat effects and the constraints each activity carries.
export const WELLBEING_EFFECTS = {
  HANG_OUT: {
    // happiness per hour = closeness (1-5) * this factor
    happinessPerClosenessPerHour: 4,
    energyPerHour: -6, // costs energy
    maxDuration: 4,
  },
  ATTEND_CLUB_EVENT: {
    happinessPerHour: 12, // restores happiness
    energyPerHour: 4, // restores some energy
    maxDuration: 3,
    minEnergyToAttend: 20, // must have at least this much energy to attend
    minStudyHoursToAttend: 3, // must have completed at least this many study hours first
  },
} as const;

export interface WellbeingResult {
  activity: string;
  targetId: string;
  happinessGained: number;
  energyChanged: number;
  energy: number;
  happiness: number;
  timeElapsed: number;
  currentActivity: string;
}

// --- helpers shared with the recommender (single source of truth) ----------

// The energy HANG_OUT would consume for a given duration (a positive number).
export function hangOutEnergyCost(duration: number): number {
  return -WELLBEING_EFFECTS.HANG_OUT.energyPerHour * duration;
}

// Total study hours banked across every exam in the simulation.
export function totalStudyHours(simulation: Simulation): number {
  return simulation.universeData.exams.reduce(
    (sum, exam) => sum + exam.studyHoursCompleted,
    0
  );
}

// The social connection a HANG_OUT is targeting, or an INVALID_TARGET error.
function findConnectionOrError(
  simulationId: number,
  connectionId: string
): Result<SocialConnection> {
  const data = getData();
  const connection = data.socialConnections.find(
    c => c.simulationId === simulationId && c.connectionId === connectionId
  );
  if (!connection) {
    return { error: 'INVALID_TARGET', message: 'Social connection does not exist for this simulation' };
  }
  return connection;
}

// The opportunity an ATTEND_CLUB_EVENT targets, but only if it has been joined.
function findJoinedOpportunityOrError(
  simulation: Simulation,
  opportunityId: string
): Result<Opportunity> {
  const opportunity = simulation.universeData.opportunities.find(
    o => o.opportunityId === opportunityId
  );
  if (!opportunity) {
    return { error: 'INVALID_TARGET', message: 'Club/opportunity does not exist in this simulation' };
  }
  if (!simulation.joinedOpportunities.includes(opportunityId)) {
    return { error: 'INVALID_TARGET', message: 'You must join this club/opportunity before attending its event' };
  }
  return opportunity;
}

// --- main entry point ------------------------------------------------------

// Performs one of the two group-designed wellbeing activities.
// Errors (in order): INVALID_ACTIVITY, INVALID_DURATION, INVALID_STUDENT_ID,
//                    INVALID_SIMULATION, SIMULATION_ENDED, INVALID_TARGET,
//                    INSUFFICIENT_ENERGY, INSUFFICIENT_STUDY_HOURS
export function wellbeingActivityPerform(
  studentId: string,
  simulationId: number,
  activity: string,
  targetId: string,
  duration: number
): Result<WellbeingResult> {
  // Validate the activity is one of the two designed wellbeing activities
  if (activity !== HANG_OUT && activity !== ATTEND_CLUB_EVENT) {
    return { error: 'INVALID_ACTIVITY', message: 'Activity must be one of: HANG_OUT, ATTEND_CLUB_EVENT' };
  }

  const maxDuration = activity === HANG_OUT
    ? WELLBEING_EFFECTS.HANG_OUT.maxDuration
    : WELLBEING_EFFECTS.ATTEND_CLUB_EVENT.maxDuration;

  // Validate duration is a positive integer within this activity's time cap
  if (!Number.isInteger(duration) || duration < 1 || duration > maxDuration) {
    return { error: 'INVALID_DURATION', message: `Duration must be an integer between 1 and ${maxDuration} hours` };
  }

  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  // A wellbeing activity can only be performed while the simulation is ACTIVE
  checkWinLoseConditions(simulation);
  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'SIMULATION_ENDED', message: 'No further activities can be performed on a completed simulation' };
  }

  const previousHappiness = simulation.happiness;
  const previousEnergy = simulation.energy;

  if (activity === HANG_OUT) {
    // Prerequisite: the targeted social connection must exist
    const connection = findConnectionOrError(simulationId, targetId);
    if (isError(connection)) return connection;

    // Constraint: must be able to afford the energy cost
    const energyCost = hangOutEnergyCost(duration);
    if (simulation.energy < energyCost) {
      return { error: 'INSUFFICIENT_ENERGY', message: 'Not enough energy to hang out for this duration' };
    }

    const effects = WELLBEING_EFFECTS.HANG_OUT;
    // Happiness gain scales with how close the connection is
    simulation.happiness = clampStat(
      simulation.happiness + effects.happinessPerClosenessPerHour * connection.closeness * duration
    );
    simulation.energy = clampStat(simulation.energy + effects.energyPerHour * duration);
    simulation.currentActivity = HANG_OUT;
  } else {
    // ATTEND_CLUB_EVENT — prerequisite: the club/opportunity must be joined
    const opportunity = findJoinedOpportunityOrError(simulation, targetId);
    if (isError(opportunity)) return opportunity;

    const effects = WELLBEING_EFFECTS.ATTEND_CLUB_EVENT;

    // Constraint: must have a minimum energy to turn up to the event
    if (simulation.energy < effects.minEnergyToAttend) {
      return {
        error: 'INSUFFICIENT_ENERGY',
        message: `You need at least ${effects.minEnergyToAttend} energy to attend a club event`,
      };
    }

    // Constraint: must have banked a minimum number of study hours first
    if (totalStudyHours(simulation) < effects.minStudyHoursToAttend) {
      return {
        error: 'INSUFFICIENT_STUDY_HOURS',
        message: `You must complete at least ${effects.minStudyHoursToAttend} study hours before attending a club event`,
      };
    }

    simulation.happiness = clampStat(simulation.happiness + effects.happinessPerHour * duration);
    simulation.energy = clampStat(simulation.energy + effects.energyPerHour * duration);
    simulation.currentActivity = ATTEND_CLUB_EVENT;
  }

  // Consistent state update: time advances and the win/lose check re-runs
  simulation.timeElapsed += duration;
  checkWinLoseConditions(simulation);

  return {
    activity,
    targetId,
    happinessGained: simulation.happiness - previousHappiness,
    energyChanged: simulation.energy - previousEnergy,
    energy: simulation.energy,
    happiness: simulation.happiness,
    timeElapsed: simulation.timeElapsed,
    currentActivity: simulation.currentActivity,
  };
}