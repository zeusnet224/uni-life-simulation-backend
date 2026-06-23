// Returns the study progress from a simulation
function examStudyProgress(simulationId, studyHoursCompleted) {
    return {
        examId: 'E2-COMP1531',
        studyProgress: 60,
    };
}

// Takes in a studentId and examId and records the attempt for this exam
function examAttemptRecord(examId, attempt, studentId) {
    return {
        exams: [
            {
                examStatus: 'ALREADY_ATTEMPTED',
                examScore: 51,
                examOutcome: 'PASSED',
            }
        ]
    };
}

// Takes in a studentId and the examId and checks if there has been an attempt
// The exam status is shown if exam has already been attempted.
function examPreventAttempt(examId, attempt, studentId) {
    return {
        exams: [
            {
                examId: 'E2-COMP1521',
                examStatus: 'ALREADY_ATTEMPTED',
            }
        ]
    };
}


