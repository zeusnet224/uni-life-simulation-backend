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
function simulationStatus(studentId, simulationId) {
    return {
        simulations: [
            {
                simulationStatus: 'ACTIVE', 
                currentActivity: 'STUDYING',
                energy: 2,
                happiness: 5,
                timeElapsed: 20
            }
        ]
    }
}