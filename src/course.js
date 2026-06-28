import { getData } from './dataStore.js';


// Returns a list of ALL courses within the simulation's universe
function courseRetrieveCourses(simulationId) {
    const data = getData();

    // check the simulation exists
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

// Returns a list of ALL exams and their study hour requirements
function courseRetrieveExams(simulationId) {
    const data = getData();

    //checks the simulation exists
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

// Returns all relevant details about a SPECIFIC course and its status
function courseRetrieveCourseDetails(courseId, simulationId) {
    const data = getData();

    //checks the simulation exists
    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    // checks the course exists
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


// Returns relevant details about a SPECIFIC exam within the simulation
function courseRetrieveExamDetails(simulationId, examId) {
    const data = getData();

    // checks the simulation exists
    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    // checks the exam exists
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

// Returns the status for a SPECIFIC course within the simulation
function courseCompletion(courseId, studentId, simulationId) {

    const data = getData();

    // checks the student exists
    const student = data.users.find(student => student.studentId === studentId);
    if (!student) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not exist' };
    }

    //checks the simulation exists
    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    // checks the simulation course exists
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