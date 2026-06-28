import { getData } from './dataStore.js';
import { checkWinLoseConditions } from './action.js';

// Returns the study progress from a simulation
/*
- Takes exam from a given simulation
- Does not advance timeElapsed or change currentActivity
- Pass condition: studyHoursCompleted >= requiredStudyHours
*/

function examStudyProgress(simulationId, studentId, examId) {
    const data = getData();

    // check student exists first
    const student = data.users.find(u => u.studentId === studentId);
    if (!student) {
        return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not refer to a registered student' };
    }

    // check simulation exists
    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    // check simulation belongs to this student
    if (simulation.studentId !== studentId) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to the given student' };
    }

    // check exam exists in this simulation
    const exam = simulation.exams.find(e => e.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist'};
    }

    return {
        examId:              exam.examId,
        studyHoursCompleted: exam.studyHoursCompleted,  // fixed: was called studyProgress
        requiredStudyHours:  exam.requiredStudyHours,
        // ready uses studyHoursCompleted not studyProgress (studyProgress field doesn't exist)
        ready: exam.studyHoursCompleted >= exam.requiredStudyHours,
    };
}


// Takes in a studentId and examId and records the attempt for this exam
function examAttemptRecord(examId, simulationId, studentId) {
    const data = getData();

    // check student exists first (correct error order)
    const user = data.users.find(u => u.studentId === studentId);
    if (!user) {
        return { error: 'INVALID_STUDENT_ID', message: 'Student does not exist' };
    }

    // check simulation exists
    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    // check simulation belongs to this student
    if (simulation.studentId !== studentId) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to the given student' };
    }

    // simulation must be ACTIVE
    if (simulation.simulationStatus !== 'ACTIVE') {
        return { error: 'SIMULATION_ENDED', message: 'Cannot attempt exams in a completed simulation' };
    }

    // check exam exists
    const exam = simulation.exams.find(e => e.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist'};
    }

    // prevent re-attempt
    if (exam.examStatus === 'ATTEMPTED') {
        return { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this exam'};
    }

    // apply 30 energy cost — clamped to 0
    simulation.energy = simulation.energy - 30;
    if (simulation.energy < 0) {
        simulation.energy = 0;
    }

    // determine pass or fail
    exam.examStatus = 'ATTEMPTED';
    if (exam.studyHoursCompleted >= exam.requiredStudyHours) {
        exam.examOutcome = 'PASS';
    } else {
        exam.examOutcome = 'FAIL';
    }

    // update course status based on all exam outcomes
    const courseExams = simulation.exams.filter(e => e.courseId === exam.courseId);
    const course = simulation.courses.find(c => c.courseId === exam.courseId);

    let totalPassed = 0;
    let totalFailed = 0;
    let totalAttempted = 0;

    for (const e of courseExams) {
        if (e.examOutcome === 'PASS') totalPassed++;
        if (e.examOutcome === 'FAIL') totalFailed++;
        if (e.examStatus === 'ATTEMPTED') totalAttempted++;
    }

    // 2 or more failures means course is unrecoverable
    if (totalFailed >= 2) {
        course.courseStatus = 'FAILED';
    } else if (totalAttempted === courseExams.length && totalPassed >= 2) {
        // all attempted AND at least 2 passed means course passed
        course.courseStatus = 'PASSED';
    }

    // check win/lose conditions immediately after exam
    checkWinLoseConditions(simulation);

    return {
        exam: [
            {
                examId:      exam.examId,
                name:        exam.name,
                examStatus:  exam.examStatus,
                examOutcome: exam.examOutcome,
            }
        ]
    };
}

//removed this as its already taken care of in checking the exam status to see whether its attempted
// Takes in a studentId and the examId and checks if there has been an attempt
// The exam status is shown if exam has already been attempted.
function examPreventAttempt(examId, simulationId, studentId) {
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const user = data.users.find(u => u.studentId === studentId);
    if (!user) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student does not exist' };
    }

    const exam = simulation.exams.find(sim => sim.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist'};
    }

    return {
        exam: [
            {
                examId: exam.examId,
                name: exam.name,
                examStatus: exam.examStatus,
                examOutcome: exam.examOutcome,
            }
        ]
    };
}

export { examStudyProgress, examAttemptRecord, examPreventAttempt };