import { getData } from './dataStore.js';

// Stat effects per hour for each action
const ACTION_EFFECTS = {
  DOOM_SCROLLING: { energyPerHour: 3,   happinessPerHour: 2  },
  STUDYING:       { energyPerHour: -15,  happinessPerHour: -5 },
  SLEEPING:       { energyPerHour: 15,   happinessPerHour: 2  },
  EATING:         { energyPerHour: 10,   happinessPerHour: 3  },
  EXERCISING:     { energyPerHour: -10,  happinessPerHour: 6  },
};

const VALID_ACTIONS = ['DOOM_SCROLLING', 'STUDYING', 'SLEEPING', 'EATING', 'EXERCISING'];

// Clamp a stat value to the 0-100 range
function clampStat(value) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

// Check win/lose conditions and update simulationStatus immediately.
// Called after every action and every exam attempt.
function checkWinLoseConditions(simulation) {
  // Count total exam failures across the whole simulation
  let totalExamFailures = 0;
  for (const exam of simulation.universeData.exams) {
    if (exam.examOutcome === 'FAIL') {
      totalExamFailures++;
    }
  }

  // Check if any course has failed
  let anyCourseFailed = false;
  for (const course of simulation.universeData.courses) {
    if (course.courseStatus === 'FAILED') {
      anyCourseFailed = true;
    }
  }

  // Dropout conditions — any one triggers dropout immediately
  if (simulation.energy <= 0 || simulation.happiness <= 0 || anyCourseFailed || totalExamFailures >= 5) {
    simulation.simulationStatus = 'DROPPED_OUT';
    return;
  }

  // Graduation condition — all courses must be passed
  let allCoursesPassed = true;
  for (const course of simulation.universeData.courses) {
    if (course.courseStatus !== 'PASSED') {
      allCoursesPassed = false;
    }
  }

  if (allCoursesPassed && simulation.energy > 0 && simulation.happiness > 0) {
    simulation.simulationStatus = 'GRADUATED';
  }
}

// Max 3 consecutive hours, then must do another activity for at least 1 hour.
// Constraints are checked based on when the action ENDS not when it starts.
// Returns 'INVALID_ACTION' if violated, null if OK.
function checkStudyingConstraint(simulation, duration) {
  const history = simulation.actionHistory;

  // Count consecutive study hours at the end of history
  let recentStudyHours = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'STUDYING') {
      recentStudyHours += history[i].duration;
    } else {
      // hit a non-study action, streak is broken
      break;
    }
  }

  // Check if adding this duration would exceed 3 consecutive hours
  if (recentStudyHours + duration > 3) {
    return 'INVALID_ACTION';
  }
  return null;
}

// Check EXERCISING constraints.
// Rule 1: must have eaten within last 4 hours of when exercise ends.
// Rule 2: 1-hour cooldown from when previous exercise session ended.
// Returns 'INVALID_ACTION' if violated, null if OK.
function checkExercisingConstraint(simulation, duration) {
  const history = simulation.actionHistory;
  const currentTime = simulation.timeElapsed;
  const actionEndTime = currentTime + duration;

  // Rule 2: check 1-hour cooldown from previous exercise session
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'EXERCISING') {
      if (currentTime < history[i].endTime + 1) {
        return 'INVALID_ACTION';
      }
      break;
    }
  }

  // Rule 1: check must have eaten within last 4 hours of when exercise ends
  let hasEatenRecently = false;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === 'EATING') {
      if (actionEndTime - history[i].endTime <= 4) {
        hasEatenRecently = true;
      }
      break;
    }
  }

  if (!hasEatenRecently) {
    return 'INVALID_ACTION';
  }

  return null;
}

// Apply a wellbeing or study action to a simulation and update state.
// Errors returned in this order: INVALID_ACTION, INVALID_DURATION,
// INVALID_STUDENT_ID, INVALID_SIMULATION, SIMULATION_ENDED, INVALID_EXAM
function simulationApplyAction(studentId, simulationId, action, duration, examId) {
  const data = getData();

  // Validate action type is one of the 5 valid actions
  if (!VALID_ACTIONS.includes(action)) {
    return { error: 'INVALID_ACTION', message: 'Action must be one of: DOOM_SCROLLING, STUDYING, SLEEPING, EATING, EXERCISING' };
  }

  // Validate duration is a positive integer (at least 1 hour)
  if (!Number.isInteger(duration) || duration < 1) {
    return { error: 'INVALID_DURATION', message: 'Duration must be a positive integer of at least 1 hour' };
  }

  // Validate student exists
  const student = data.users.find(u => u.studentId === studentId);
  if (!student) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not refer to a registered student' };
  }

  // Validate simulation exists
  const simulation = data.simulations.find(s => s.simulationId === simulationId);
  if (!simulation) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not refer to a valid simulation' };
  }

  // Validate simulation belongs to this student
  if (simulation.studentId !== studentId) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to the given student' };
  }

  // Simulation must still be ACTIVE to perform actions
  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'SIMULATION_ENDED', message: 'No further actions can be applied to a completed simulation' };
  }

  // STUDYING requires a valid examId to track which exam is being studied for
  if (action === 'STUDYING') {
    if (!examId) {
      return { error: 'INVALID_EXAM', message: 'A STUDYING action requires an examId' };
    }
    const exam = simulation.universeData.exams.find(e => e.examId === examId);
    if (!exam) {
      return { error: 'INVALID_EXAM', message: 'Exam ID does not exist in this simulation' };
    }
    // check the 3 consecutive hours constraint
    const studyErr = checkStudyingConstraint(simulation, duration);
    if (studyErr) {
      return { error: studyErr, message: 'Studying constraint violated: max 3 consecutive hours then must take a break' };
    }
  }

  // EXERCISING has eating and cooldown constraints
  if (action === 'EXERCISING') {
    const exerciseErr = checkExercisingConstraint(simulation, duration);
    if (exerciseErr) {
      return { error: exerciseErr, message: 'Exercising constraint violated: must eat within 4 hours and 1-hour cooldown required' };
    }
  }

  // Apply stat changes using the effects table
  const effects = ACTION_EFFECTS[action];
  simulation.energy    = clampStat(simulation.energy    + effects.energyPerHour    * duration);
  simulation.happiness = clampStat(simulation.happiness + effects.happinessPerHour * duration);

  // Update study hours for the target exam if action is STUDYING
  if (action === 'STUDYING') {
    const exam = simulation.universeData.exams.find(e => e.examId === examId);
    exam.studyHoursCompleted += duration;
  }

  // Advance time and update current activity
  simulation.timeElapsed    += duration;
  simulation.currentActivity = action;

  // Record this action in history for future constraint checks
  simulation.actionHistory.push({
    action,
    duration,
    startTime: simulation.timeElapsed - duration,
    endTime:   simulation.timeElapsed,
    examId:    action === 'STUDYING' ? examId : null,
  });

  // Check win/lose conditions immediately after the action
  checkWinLoseConditions(simulation);

  return {
    simulationId:    simulation.simulationId,
    currentActivity: simulation.currentActivity,
    duration,
    energy:          simulation.energy,
    happiness:       simulation.happiness,
    timeElapsed:     simulation.timeElapsed,
  };
}

export { simulationApplyAction, checkWinLoseConditions, clampStat };