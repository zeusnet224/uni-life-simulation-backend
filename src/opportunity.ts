import {
  findStudentOrError,
  findOwnedSimulationOrError,
  isError,
} from './validators.js';
import {
  checkWinLoseConditions,
  clampStat,
} from './action.js';
import {
  Opportunity,
  Result,
  Simulation,
} from './types.js';

type OpportunityView = Opportunity & {
  isJoined: boolean;
};

function findOpportunityOrError(
  simulation: Simulation,
  opportunityId: string
): Result<Opportunity> {
  const opportunity = simulation.universeData.opportunities.find(
    currentOpportunity =>
      currentOpportunity.opportunityId === opportunityId
  );

  if (!opportunity) {
    return {
      error: 'INVALID_OPPORTUNITY',
      message: 'Opportunity ID does not exist',
    };
  }

  return opportunity;
}

function hasJoinedOpportunity(
  simulation: Simulation,
  opportunityId: string
): boolean {
  return simulation.joinedOpportunities.includes(opportunityId);
}

function simulationHasEnded(simulation: Simulation): boolean {
  checkWinLoseConditions(simulation);

  return simulation.simulationStatus !== 'ACTIVE';
}

// Lists every opportunity and whether the student has joined it.
export function opportunitiesList(
  studentId: string,
  simulationId: number
): Result<{ opportunities: OpportunityView[] }> {
  const student = findStudentOrError(studentId);

  if (isError(student)) {
    return student;
  }

  const simulation = findOwnedSimulationOrError(
    studentId,
    simulationId
  );

  if (isError(simulation)) {
    return simulation;
  }

  const opportunities = simulation.universeData.opportunities.map(
    opportunity => ({
      ...opportunity,
      isJoined: hasJoinedOpportunity(
        simulation,
        opportunity.opportunityId
      ),
    })
  );

  return { opportunities };
}

// Joins an opportunity without immediately applying its effects.
export function opportunityJoin(
  studentId: string,
  simulationId: number,
  opportunityId: string
): Result<{ opportunityId: string; isJoined: boolean }> {
  const student = findStudentOrError(studentId);

  if (isError(student)) {
    return student;
  }

  const simulation = findOwnedSimulationOrError(
    studentId,
    simulationId
  );

  if (isError(simulation)) {
    return simulation;
  }

  if (simulationHasEnded(simulation)) {
    return {
      error: 'SIMULATION_ENDED',
      message: 'Cannot join an opportunity after the simulation has ended',
    };
  }

  const opportunity = findOpportunityOrError(
    simulation,
    opportunityId
  );

  if (isError(opportunity)) {
    return opportunity;
  }

  if (hasJoinedOpportunity(simulation, opportunityId)) {
    return {
      error: 'ALREADY_JOINED',
      message: 'Student has already joined this opportunity',
    };
  }

  if (simulation.joinedOpportunities.length >= 3) {
    return {
      error: 'OPPORTUNITY_LIMIT_REACHED',
      message: 'A student may join no more than 3 opportunities',
    };
  }

  simulation.joinedOpportunities.push(opportunityId);

  return {
    opportunityId,
    isJoined: true,
  };
}

// Leaves an opportunity that the student previously joined.
export function opportunityLeave(
  studentId: string,
  simulationId: number,
  opportunityId: string
): Result<{ opportunityId: string; isJoined: boolean }> {
  const student = findStudentOrError(studentId);

  if (isError(student)) {
    return student;
  }

  const simulation = findOwnedSimulationOrError(
    studentId,
    simulationId
  );

  if (isError(simulation)) {
    return simulation;
  }

  if (simulationHasEnded(simulation)) {
    return {
      error: 'SIMULATION_ENDED',
      message: 'Cannot leave an opportunity after the simulation has ended',
    };
  }

  const opportunity = findOpportunityOrError(
    simulation,
    opportunityId
  );

  if (isError(opportunity)) {
    return opportunity;
  }

  const joinedIndex = simulation.joinedOpportunities.indexOf(opportunityId);

  if (joinedIndex === -1) {
    return {
      error: 'OPPORTUNITY_NOT_JOINED',
      message: 'Student has not joined this opportunity',
    };
  }

  simulation.joinedOpportunities.splice(joinedIndex, 1);

  return {
    opportunityId,
    isJoined: false,
  };
}

// Applies the effects of an opportunity that the student has joined.
export function opportunityApplyEffects(
  studentId: string,
  simulationId: number,
  opportunityId: string,
  examId: string
): Result<{
  opportunityId: string;
  examId: string;
  happinessEffectApplied: number;
  academicEffectApplied: number;
  weeklyHoursApplied: number;
  happiness: number;
  studyHoursCompleted: number;
  timeElapsed: number;
  currentActivity: string;
}> {
  const student = findStudentOrError(studentId);

  if (isError(student)) {
    return student;
  }

  const simulation = findOwnedSimulationOrError(
    studentId,
    simulationId
  );

  if (isError(simulation)) {
    return simulation;
  }

  if (simulationHasEnded(simulation)) {
    return {
      error: 'SIMULATION_ENDED',
      message: 'Cannot apply opportunity effects after the simulation has ended',
    };
  }

  const opportunity = findOpportunityOrError(
    simulation,
    opportunityId
  );

  if (isError(opportunity)) {
    return opportunity;
  }

  if (!hasJoinedOpportunity(simulation, opportunityId)) {
    return {
      error: 'OPPORTUNITY_NOT_JOINED',
      message: 'Student must join the opportunity before applying its effects',
    };
  }

  const exam = simulation.universeData.exams.find(
    currentExam => currentExam.examId === examId
  );

  if (!exam) {
    return {
      error: 'INVALID_EXAM',
      message: 'Exam ID does not exist in this simulation',
    };
  }

  const previousHappiness = simulation.happiness;
  const previousStudyHours = exam.studyHoursCompleted;

  simulation.happiness = clampStat(
    simulation.happiness + opportunity.happinessBonus
  );

  exam.studyHoursCompleted = Math.max(
    0,
    exam.studyHoursCompleted + opportunity.academicBonus
  );

  simulation.timeElapsed += opportunity.weeklyHours;
  simulation.currentActivity = `OPPORTUNITY:${opportunityId}`;

  checkWinLoseConditions(simulation);

  return {
    opportunityId,
    examId,
    happinessEffectApplied:
      simulation.happiness - previousHappiness,
    academicEffectApplied:
      exam.studyHoursCompleted - previousStudyHours,
    weeklyHoursApplied: opportunity.weeklyHours,
    happiness: simulation.happiness,
    studyHoursCompleted: exam.studyHoursCompleted,
    timeElapsed: simulation.timeElapsed,
    currentActivity: simulation.currentActivity,
  };
}
