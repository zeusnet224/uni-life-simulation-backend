import { getData } from './dataStore.js';
import { checkWinLoseConditions } from './action.js';

// Returns the study progress for a specific exam in a simulation.
// This is a read-only function — it does not change timeElapsed or currentActivity.
// Parameters: simulationId, studentId, examId
// Returns: { examId, studyHoursCompleted, requiredStudyHours, ready }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_EXAM

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
    const exam = simulation.universeData.exams.find(e => e.examId === examId);
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


// Records an exam attempt, applies the 30 energy cost, determines pass/fail,
// updates course status, and checks win/lose conditions immediately.
// Pass condition: studyHoursCompleted >= requiredStudyHours
// Taking an exam does NOT advance timeElapsed or change currentActivity.
// Parameters: examId, simulationId, studentId
// Returns: { exam: [{ examId, name, examStatus, examOutcome }] }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, SIMULATION_ENDED, INVALID_EXAM, ALREADY_ATTEMPTED
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

// Check simulation belongs to this student
    if (simulation.studentId !== studentId) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to the given student' };
    }

// Simulation must be ACTIVE
    if (simulation.simulationStatus !== 'ACTIVE') {
        return { error: 'SIMULATION_ENDED', message: 'Cannot attempt exams in a completed simulation' };
    }

// Check exam exists
    const exam = simulation.universeData.exams.find(sim => sim.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist'};
    }

    // Prevent re-attempt
    if (exam.examStatus === 'ATTEMPTED') {
        return { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this exam'};
    }

// apply 30 energy cost — clamped to 0
    simulation.energy = simulation.energy - 30;
    if (simulation.energy < 0) {
        simulation.energy = 0;
    }

// Determine pass or fail
    exam.examStatus = 'ATTEMPTED';
    if (exam.studyHoursCompleted >= exam.requiredStudyHours) {
        exam.examOutcome = 'PASS';
    } else {
        exam.examOutcome = 'FAIL';
    }

// Update course status based on all exam outcomes
    const courseExams = simulation.universeData.exams.filter(e => e.courseId === exam.courseId);
    const course = simulation.universeData.courses.find(c => c.courseId === exam.courseId);

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

// Checks if an exam has already been attempted by returning its current status.
// This is handled inside examAttemptRecord but kept as a separate utility function.
// Parameters: examId, simulationId, studentId
// Returns: { exam: [{ examId, name, examStatus, examOutcome }] }
// Errors: INVALID_SIMULATION, INVALID_STUDENT_ID, INVALID_EXAM
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

    const exam = simulation.universeData.exams.find(sim => sim.examId === examId);
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