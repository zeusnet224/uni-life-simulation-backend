function courseRetrieveCourses(simulationId) {
    return {
        courses: [
            {
                courseId: String,
                name: String,
                courseDetails: String
            }
        ]
    }
}

function courseRetrieveExams(simulationId) {
    return {
        exams: [
            {
                examId: String,
                courseId: String,
                name: String,
                requiredStudyHours: Number,
                examDetails: String
            }
        ]
    }
}

function courseRetrieveCourseDetails(courseId) {
    return {
        courses: [
            {
                courseId: String,
                name: String,
                courseDetails: String
            }
        ]
    }
}

function courseRetrieveExamDetails(examId) {
    return {
        exams: [
            {
                examId: String,
                courseId: String,
                name: String,
                requiredStudyHours: Number,
                examDetails: String
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