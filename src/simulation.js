import { getData } from './dataStore.js';

// start a new simulation instance for the authenticated student
function simulationCreate(studentId, universeData) {
  const data = getData();

  const student = data.users.find(u => u.studentId === studentId);
  if (!student) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not refer to a valid registered student' };
  }

  if (universeData === null || typeof universeData !== 'object' || Array.isArray(universeData)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must be an object' };
  }

  if (universeData.error) {
    return { error: 'INVALID_UNIVERSE', message: universeData.message || 'Universe data is invalid' };
  }

  if (!Array.isArray(universeData.courses)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must contain a courses array' };
  }

  const exams = Array.isArray(universeData.exams) ? universeData.exams : [];

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
    universeData: {
      ...universeData,
      courses: universeData.courses.map(course => ({
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

  return {
    simulationId,
  };
}

function simulationStatus(studentId, simulationId) {
  const data = getData();
  const student = data.users.find(user => user.studentId === studentId);
  if (!student) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
  }

  const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
  if (!simulation) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
  } else if (simulation.studentId !== studentId ) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to given student ID'};
  }

  //check if all the exams have been completed and update courseStatus
  const totalFailures = simulation.universeData.exams.filter(e => e.examOutcome === 'FAIL').length;
  const anyCourseFailed = simulation.universeData.courses.some(c => c.courseStatus === 'FAILED');

  const allCoursesPassed = simulation.universeData.courses.every(c => c.courseStatus === 'PASSED');

  if (
    simulation.energy <= 0 ||
    simulation.happiness <= 0 ||
    anyCourseFailed ||
    totalFailures >= 5
  ) {
    simulation.simulationStatus = 'DROPPED_OUT';
  } else if (
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

export { simulationCreate, simulationStatus, simulationsList };



