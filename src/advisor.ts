import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';
import { Simulation, ActionType, Result } from './types.js';

export interface PlanOption {
  action: ActionType;
  allowed: boolean;
  impact: string;
  reason: string;
}

export interface PlanBlocker {
  type: string;
  description: string;
}

export interface AdvisorPlanResult {
  options: PlanOption[];
  blockers: PlanBlocker[];
}

const ACTION_EFFECTS: Record<ActionType, { energyPerHour: number; happinessPerHour: number }> = {
  DOOM_SCROLLING: { energyPerHour: 3, happinessPerHour: 2 },
  STUDYING: { energyPerHour: -15, happinessPerHour: -5 },
  SLEEPING: { energyPerHour: 15, happinessPerHour: 2 },
  EATING: { energyPerHour: 10, happinessPerHour: 3 },
  EXERCISING: { energyPerHour: -10, happinessPerHour: 6 },
};

function isStudyingAllowed(simulation: Simulation): boolean {
  const history = simulation.actionHistory;
  let recentStudyHours = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'STUDYING') {
      recentStudyHours += history[i].duration;
    } else {
      break;
    }
  }
  return recentStudyHours + 1 <= 3;
}

function isExercisingAllowed(simulation: Simulation): boolean {
  const history = simulation.actionHistory;
  const currentTime = simulation.timeElapsed;
  const actionEndTime = currentTime + 1;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'EXERCISING') {
      if (currentTime < history[i].endTime + 1) {
        return false;
      }
      break;
    }
  }

  let hasEatenRecently = false;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'EATING') {
      if (actionEndTime - history[i].endTime <= 4) {
        hasEatenRecently = true;
      }
      break;
    }
  }
  return hasEatenRecently;
}

function describeOption(simulation: Simulation, action: ActionType): PlanOption {
  const effects = ACTION_EFFECTS[action];
  let allowed = true;
  let reason: string;

  if (action === 'STUDYING') {
    allowed = isStudyingAllowed(simulation);
    reason = allowed
      ? 'Studying now makes progress toward an exam before energy runs low'
      : 'Studying now would exceed the 3 consecutive hour limit; take a break first';
  } else if (action === 'EXERCISING') {
    allowed = isExercisingAllowed(simulation);
    reason = allowed
      ? 'Exercising now boosts happiness while the eating window and cooldown allow it'
      : 'Exercising now is blocked by the eating window or cooldown constraint';
  } else if (action === 'SLEEPING') {
    reason = simulation.energy < 40
      ? 'Energy is low; sleeping now restores it before it becomes critical'
      : 'Sleeping restores energy for later actions';
  } else if (action === 'EATING') {
    reason = 'Eating restores energy and happiness, and is required before exercising again';
  } else {
    reason = simulation.happiness < 40
      ? 'Happiness is low; doom scrolling is a low-cost way to recover some happiness'
      : 'Doom scrolling is a low-cost filler action';
  }

  const energyChange = effects.energyPerHour;
  const happinessChange = effects.happinessPerHour;
  const impact = `${energyChange >= 0 ? '+' : ''}${energyChange} energy, ${happinessChange >= 0 ? '+' : ''}${happinessChange} happiness per hour`;

  return { action, allowed, impact, reason };
}

function computeBlockers(simulation: Simulation): PlanBlocker[] {
  const blockers: PlanBlocker[] = [];

  if (simulation.energy < 30) {
    blockers.push({
      type: 'LOW_ENERGY',
      description: `Energy is low (${simulation.energy}/100) — risk of dropout if it reaches 0`,
    });
  }

  if (simulation.happiness < 30) {
    blockers.push({
      type: 'LOW_HAPPINESS',
      description: `Happiness is low (${simulation.happiness}/100) — risk of dropout if it reaches 0`,
    });
  }

  const unattemptedExams = simulation.universeData.exams.filter(e => e.examStatus === 'NOT_ATTEMPTED');
  const notReadyExams = unattemptedExams.filter(e => e.studyHoursCompleted < e.requiredStudyHours);
  if (notReadyExams.length > 0) {
    blockers.push({
      type: 'UPCOMING_EXAM',
      description: `${notReadyExams.length} exam(s) have not yet reached the required study hours`,
    });
  }

  if (simulation.joinedSocieties.length === 0) {
    blockers.push({
      type: 'NO_SOCIAL_SUPPORT',
      description: 'No societies joined yet — joining one can provide wellbeing support',
    });
  }

  if (blockers.length === 0) {
    blockers.push({
      type: 'NONE',
      description: 'No immediate risks detected — current state is stable',
    });
  }

  return blockers;
}

export function advisorPlan(studentId: string, simulationId: number): Result<AdvisorPlanResult> {
  const student = findStudentOrError(studentId);
  if (isError(student)) return student;

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const actions: ActionType[] = ['STUDYING', 'SLEEPING', 'EATING', 'EXERCISING', 'DOOM_SCROLLING'];
  const options = actions.map(action => describeOption(simulation, action));
  const blockers = computeBlockers(simulation);

  return { options, blockers };
}
