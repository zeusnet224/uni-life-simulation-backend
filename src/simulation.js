// start a new simulation instance for the authenticated student
function simulationCreate(studentId, universeData) {
  return {
    simulationId: 1,
  };
}

function simulationStatus(studentId, simulationId) {
  return {
    simulationStatus: 'ACTIVE',
    currentActivity: 'DOOM_SCROLLING',
    energy: 75,
    happiness: 60,
    timeElapsed: 1,
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

module.exports = { simulationCreate, simulationStatus, simulationsList };



