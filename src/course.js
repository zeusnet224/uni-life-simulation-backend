import { getData } from './dataStore.js';

// Returns a summary list of all courses in the simulation.
// Each course includes courseId and name only.
// Returns { courses: [{ courseId, name }] }
// Errors: INVALID_SIMULATION
function courseRetrieveCourses(simulationId) {
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    return {
        courses: simulation.universeData.courses.map(course => ({
            courseId: course.courseId,
            name: course.name
        }))
    };
}

// Returns a summary list of all exams across all courses in the simulation.
// Each exam includes examId, courseId, name and requiredStudyHours.
// Returns { exams: [{ examId, courseId, name, requiredStudyHours }] }
// Errors: INVALID_SIMULATION
function courseRetrieveExams(simulationId) {
    // returns all exams in the universe, not just attempted ones
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    return {
        exams: simulation.universeData.exams.map(exam => ({
            examId: exam.examId,
            courseId: exam.courseId,
            name: exam.name,
            requiredStudyHours: exam.requiredStudyHours
        }))
    };
}

// Returns full details for a specific course in the simulation.
// Includes courseId, name, courseDetails and current courseStatus.
// Returns { course: [{ courseId, name, courseDetails, courseStatus }] }
// Errors: INVALID_SIMULATION, INVALID_COURSE
function courseRetrieveCourseDetails(courseId, simulationId) {
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const course = simulation.universeData.courses.find(c => c.courseId === courseId);
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

// Returns full details for a specific exam in the simulation.
// Includes examId, courseId, name and requiredStudyHours.
// Returns { exam: [{ examId, courseId, name, requiredStudyHours }] }
// Errors: INVALID_SIMULATION, INVALID_EXAM
function courseRetrieveExamDetails(simulationId, examId) {
    const data = getData();
    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const exam = simulation.universeData.exams.find(e => e.examId === examId);
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

// Returns the completion status of a specific course for a given student.
// courseStatus reflects whether the course is IN_PROGRESS, PASSED, or FAILED.
// Returns { course: [{ courseId, courseStatus }] }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_COURSE
function courseCompletion(courseId, studentId, simulationId) {

    const data = getData();

    const user = data.users.find(u => u.studentId === studentId);
    if (!user) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student does not exist' };
    }

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const course = simulation.universeData.courses.find(c => c.courseId === courseId);
    if (!course) {
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
    courseCompletion,
};