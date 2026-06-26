import { getData } from './dataStore.js';

// start a new simulation instance for the authenticated student
function simulationCreate(studentId, universeData) {
  return {
    simulationId: 1,
  };
}

function simulationStatus(studentId, simulationId) {

  const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
  if (!simulation) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
  } else if (simulation.simulationId !== simulationId ) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to given student ID'};
  }

  const student = data.users.find(sim => sim.studentId === studentId);
  if (!student) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
  }

  return {
    simulationStatus: 'ACTIVE',
    currentActivity: 'DOOM_SCROLLING',
    energy: 75,
    happiness: 60,
    timeElapsed: 1,
  };
}

function simulationStatusFinal(studentId, simulationId) {
  const data = getData();

  const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
  if (!simulation) {
      return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
  }

  const student = data.users.find(sim => sim.studentId === studentId);
  if (!student) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
  }

  //check if all the exams have been completed and update courseStatus
  const totalFailures = simulation.exams.filter(e => e.isPassed === false).length;
  const anyCourseFailed = simulation.courses.some(c => c.courseStatus === 'FAILED');

  if (
    simulation.energy <= 0 ||
    simulation.happiness <= 0 ||
    anyCourseFailed ||
    totalFailures >= 5
  ) {
    simulation.simulationStatus = 'DROPPED_OUT';
    return;
  }

  const allCoursesPassed = simulation.courses.every(c => c.courseStatus === 'PASSED');

  if (
    allCoursesPassed &&
    simulation.energy > 0 &&
    simulation.happiness > 0
  ) {
    simulation.simulationStatus = 'GRADUATED';
  }

  return {
    simulationStatus: simulation.simulationStatus,
    currentActivity: simulation.currentActivity,
    energy: simulation.energy,
    happiness: simulation.happiness,
    timeElapsed: simulation.timeElapsed,
    studyHoursCompleted: simulation.studyHoursCompleted
  };
}

// returns a list of all simulation instances belonging to a given student with summary info
function simulationsList(studentId) {
  return {
    simulations: [
      {
        simulationId: 1,
        simulationStatus: 'ACTIVE',
        currentActivity: 'DOOM_SCROLLING',
        timeElapsed: 5,
      }
    ]
  };
}

// Given a valid action and duration, the interface allows the caller to apply
// the action to a simulation and update the relevant state.
function simulationApplyAction(studentID, simulationID, currentActivity, timeElapsed, examID) {
  return {
    simulationID: 1,
    currentActivity: 'STUDYING',
    duration: 1,
    energy: 75,
    happiness: 60,
    timeElapsed: 1,
  }
}

// The interface allows the caller to identify which exam is being studied for.
function examGetStudyAction(studentId, simulationId) {
  return {
    examId: 'E2-COMP1531',
    name: 'Midterm quiz',
    duration: 2
  }
}

// The interface makes it possible to determine which action was
// applied and how long the action lasted
function simulationGetLastAction(studentId, simulationId) {
  return {
    currentActivity: 'STUDYING',
    duration: 2,
    timeElapsed: 12
  }
}

// The interface makes it possible to observe that no further
// actions should be applied to that simulation
function simulationGetconcludingNotification(studentId, simulationId) {
  return {
    simulationStatus: 'GRADUATED',
    notification: 'This simulation is completed'
  }
}

module.exports = { simulationCreate, simulationStatus, simulationsList, simulationApplyAction, examGetStudyAction, simulationGetLastAction, simulationGetconcludingNotification };



