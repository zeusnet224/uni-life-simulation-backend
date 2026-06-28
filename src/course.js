import { getData } from './dataStore.js';

function courseRetrieveCourses(simulationId) {
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    return {
        courses: simulation.courses.map(course => ({
            courseId: course.courseId,
            name: course.name
        }))
    };
}

function courseRetrieveExams(simulationId) {
    //all exams (not just the users)
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    return {
        exams: simulation.exams.map(exam => ({
            examId: exam.examId,
            courseId: exam.courseId,
            name: exam.name,
            requiredStudyHours: exam.requiredStudyHours
        }))
    };
}

function courseRetrieveCourseDetails(courseId) {
    const data = getData();

    const course = simulation.courses.find(c => c.courseId === courseId);
    if (!course) {
        return { error: 'INVALID_COURSE', message: 'Course ID does not exist' };
    }

    return {
        course: [
            {
                courseId: course.courseId,
                name: course.name,
                courseDetails: course.courseDetails,
                courseStatus: course.courseStatus
            }
        ]
    };
}

function courseRetrieveExamDetails(examId) {
    const data = getData();

    const exam = simulation.exams.find(e => e.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist' };
    }

    return {
        exam: [
            {
                examId: exam.examId,
                courseId: exam.courseId,
                name: exam.name,
                requiredStudyHours: exam.requiredStudyHours
            }
        ]
    };
}

// Takes in a courseId and checks the outcome of all 3 exams within a course
function courseCompletion(courseId, studentId) {

    const data = getData();

    const user = data.users.find(u => u.studentId === studentId);
    if (!user) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student does not exist' };
    }

    const course = simulation.courses.find(c => c.courseId === courseId);
    if (!user) {
      return { error: 'INVALID_COURSE', message: 'Course does not exist' };
    }

    return {
        course: [
            {
                courseId: course.courseId,
                courseStatus: course.courseStatus,
            }
        ]
    };
}

export {
    courseRetrieveCourses,
    courseRetrieveExams,
    courseRetrieveCourseDetails,
    courseRetrieveExamDetails,
    courseCompletion
};