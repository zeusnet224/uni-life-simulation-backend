import { getData } from './dataStore.js';

// Creates a new simulation for a registered student using the given universe data.
function simulationCreate(studentId, universeData) {
  const data = getData();

  // A simulation can only be created for a student that already exists in the datastore.
  if (!data.users.some(user => user.studentId === studentId)) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
  }

  // The universe data must be a normal object, not null, an array, or another data type.
  if (universeData === null || typeof universeData !== 'object' || Array.isArray(universeData)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must be an object' };
  }

  // If another function returned an error while creating/loading the universe, pass that error on.
  if (universeData.error) {
    return { error: 'INVALID_UNIVERSE', message: universeData.message || 'Universe data is invalid' };
  }

  // Courses are required because the simulation depends on course data to track progress.
  if (!Array.isArray(universeData.courses)) {
    return { error: 'INVALID_UNIVERSE', message: 'Universe data must contain a courses array' };
  }

  // Generate the next simulation ID by finding the largest existing ID and adding one.
  const simulationId = data.simulations.reduce((maxId, simulation) => {
    return Math.max(maxId, simulation.simulationId);
  }, 0) + 1;

  // Store the new simulation with its starting status, activity, stats, and copied universe data.
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

      // Ensure every course has a status so later functions can safely check course progress.
      courses: universeData.courses.map(course => ({
        ...course,
        courseStatus: course.courseStatus || 'ACTIVE',
      })),

      // Ensure every exam has the progress fields needed by study and exam-related functions.
      exams: Array.isArray(universeData.exams)
        ? universeData.exams.map(exam => ({
            ...exam,
            studyHoursCompleted: exam.studyHoursCompleted || 0,
            studyProgress: exam.studyProgress || 0,
            examStatus: exam.examStatus || 'NOT_ATTEMPTED',
            examScore: exam.examScore || 0,
            examOutcome: exam.examOutcome || 'NIL',
          }))
        : [],
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



