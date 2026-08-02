import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { getData } from './dataStore.js';
import { checkWinLoseConditions } from './action.js';
import { Result, Simulation } from './types.js';

export interface WellbeingResult {
  simulationStatus: string;
  currentActivity: string;
  energy: number;
  happiness: number;
  timeElapsed: number;
}

interface StatEffects {
  happinessPerHour: number;
  energyPerHour: number;
}

// Performs HANG_OUT: spends time with a social connection. Happiness gain
// scales with the connection's closeness (closeness * 2 per hour, matching
// socialConnections.ts's support-boost formula). Costs 5 energy per hour.
// Requires the caller to already have checked the 10-energy minimum.
function performHangOut(
  simulationId: number,
  targetId: string | undefined
): Result<StatEffects> {
  if (!targetId) {
    return { error: 'INVALID_TARGET', message: 'HANG_OUT requires a targetId referring to a social connection' };
  }

  const appData = getData();
  const socialConnection = appData.socialConnections.find(
    connection => connection.simulationId === simulationId && connection.connectionId === targetId
  );
  if (!socialConnection) {
    return { error: 'INVALID_TARGET', message: 'targetId does not refer to a social connection in this simulation' };
  }

  return {
    happinessPerHour: socialConnection.closeness * 2,
    energyPerHour: -5,
  };
}

// Performs ATTEND_CLUB_EVENT: attends an event for a joined opportunity/club.
// Gains the opportunity's happinessBonus happiness per hour and restores
// 2 energy per hour. Requires the targetId to be an opportunity the
// simulation has already joined.
function performAttendClubEvent(
  simulation: Simulation,
  targetId: string | undefined
): Result<StatEffects> {
  if (!targetId) {
    return { error: 'INVALID_TARGET', message: 'ATTEND_CLUB_EVENT requires a targetId referring to a club' };
  }

  const joinedOpportunity = simulation.universeData.opportunities.find(
    opportunity => opportunity.opportunityId === targetId
  );
  if (!joinedOpportunity) {
    return { error: 'INVALID_TARGET', message: 'targetId does not refer to an existing club' };
  }

  if (!simulation.joinedOpportunities.includes(targetId)) {
    return { error: 'INVALID_TARGET', message: 'Club has not been joined' };
  }

  return {
    happinessPerHour: joinedOpportunity.happinessBonus,
    energyPerHour: 2,
  };
}

// Story 3: performs a wellbeing activity (HANG_OUT or ATTEND_CLUB_EVENT) for
// the given duration, applying its effects and advancing simulation state.
// Parameters: studentId, simulationId, activity, duration, targetId
// Errors: INVALID_SIMULATION, INVALID_ACTIVITY, INVALID_DURATION, INVALID_TARGET, INSUFFICIENT_ENERGY
export function wellbeingActivityPerform(
  studentId: string,
  simulationId: number,
  activity: string,
  duration: number,
  targetId?: string
): Result<WellbeingResult> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'INVALID_SIMULATION', message: 'Simulation has already ended' };
  }

  if (activity !== 'HANG_OUT' && activity !== 'ATTEND_CLUB_EVENT') {
    return { error: 'INVALID_ACTIVITY', message: 'Activity must be HANG_OUT or ATTEND_CLUB_EVENT' };
  }

  if (!Number.isInteger(duration) || duration < 1) {
    return { error: 'INVALID_DURATION', message: 'Duration must be a positive integer of at least 1 hour' };
  }

  let activityEffects: StatEffects;

  if (activity === 'HANG_OUT') {
    if (simulation.energy < 10) {
      return { error: 'INSUFFICIENT_ENERGY', message: 'HANG_OUT requires at least 10 energy' };
    }
    const hangOutResult = performHangOut(simulationId, targetId);
    if (isError(hangOutResult)) return hangOutResult;
    activityEffects = hangOutResult;
  } else {
    const attendResult = performAttendClubEvent(simulation, targetId);
    if (isError(attendResult)) return attendResult;
    activityEffects = attendResult;
  }

  simulation.energy = clampStatValue(simulation.energy + activityEffects.energyPerHour * duration);
  simulation.happiness = clampStatValue(simulation.happiness + activityEffects.happinessPerHour * duration);
  simulation.timeElapsed += duration;
  simulation.currentActivity = activity;

  checkWinLoseConditions(simulation);

  return {
    simulationStatus: simulation.simulationStatus,
    currentActivity: simulation.currentActivity,
    energy: simulation.energy,
    happiness: simulation.happiness,
    timeElapsed: simulation.timeElapsed,
  };
}

// Clamps a stat value to the valid 0-100 range.
function clampStatValue(value: number): number {
  return Math.max(0, Math.min(100, value));
}