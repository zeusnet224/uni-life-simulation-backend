function courseRetrieveCourses(simulationId) {
    return {
        courses: [
            {
                courseId: 'COMP1531',
                name: 'Software Engineering Fundamentals',
                courseDetails: 'Software engineering principles',
                courseStatus: 'ACTIVE'
            }
        ]
    }
}

function courseRetrieveExams(simulationId) {
    return {
        exams: [
            {
                examId: 'E2-COMP1531',
                courseId: 'COMP1531',
                name: 'Final Exam',
                requiredStudyHours: 20,
                examDetails: 'Held in Flute Lab',
                studyProgress: 2,
                examStatus: 'NOT_ATTEMPTED',
                examScore: 0,
                examOutcome: 'NIL'
            }
        ]
    }
}

function courseRetrieveCourseDetails(courseId) {
    return {
        courses: [
            {
                courseId: 'COMP1531',
                name: 'Software Engineering Fundamentals',
                courseDetails: 'Software engineering principles',
                courseStatus: 'ACTIVE'
            }
        ]
    }
}

function courseRetrieveExamDetails(examId) {
    return {
        exams: [
            {
                examId: 'E2-COMP1531',
                courseId: 'COMP1531',
                name: 'Final Exam',
                requiredStudyHours: 20,
                examDetails: 'Held in Flute Lab',
                studyProgress: 2,
                examStatus: 'NOT_ATTEMPTED',
                examScore: 0,
                examOutcome: 'NIL'
            }
        ]
    }
}

function courseCompletion(examId, examOutcome, courseId) {
    return {
        courses: [
            {
                courseId: 'COMP1531',
                courseStatus: 'COMPLETED'
            }
        ]
    }
}