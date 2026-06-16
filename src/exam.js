function examStudyProgress(simulationId, studyHoursCompleted) {
    return {
        exams: [
            {
                examId: 'E2-COMP1531',
                studyProgress: 60
            }
        ]
    }
}

function examAttemptRecord(simulationId, attempt) {
    return {
        exams: [
            {
                examStatus: 'ALREADY_ATTEMPTED',
                examScore: 51,
                examOutcome: 'PASSED'
            }
        ]
    }
}

function examPreventAttempt(simulationId, attempt) {
    return {
        exams: [
            {
                examId: 'E2-COMP1521',
                examStatus: 'ALREADY_ATTEMPTED'
            }
        ]
    }
}

function examPreventAttempt(simulationId, attempt) {
    return {
        exams: [
            {
                examId: 'E2-COMP1521',
                examStatus: 'ALREADY_ATTEMPTED'
            }
        ]
    }
}

