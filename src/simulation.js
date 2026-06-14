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
        simulationStatus: 'ACTIVE', 
        currentActivity: 'DOOM_SCROLLING',
        energy: 75,
        happiness: 60,
        timeElapsed: 1
    }
}