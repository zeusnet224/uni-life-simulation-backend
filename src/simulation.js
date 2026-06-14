function simulationStatusFinal(studentId, simulationId) {
    return {
        simulations: [
            {
                simulationStatus: 'GRADUATED', 
                currentActivity: 'SLEEPING',
                energy: 67,
                happiness: 50,
                timeElapsed: 1469,
                studyHoursCompleted: 500
            }
        ]
    }
}


// start a new simulation instance for the authenticated student
function simulationCreate(studentId, universeData) {
  return {
    simulationId: 1,
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

module.exports = { simulationCreate, simulationStatusFinal, simulationsList };