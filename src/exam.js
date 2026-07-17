import { checkWinLoseConditions } from './action.js';
import { findStudentOrError, findOwnedSimulationOrError, isError } from './validators.js';

// Returns the study progress for a specific exam in a simulation.
// This is a read-only function — it does not change timeElapsed or currentActivity.
// Parameters: simulationId, studentId, examId
// Returns: { examId, studyHoursCompleted, requiredStudyHours, ready }
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION, INVALID_EXAM
function examStudyProgress(simulationId, studentId, examId) {
    const student = findStudentOrError(studentId);
    if (isError(student)) return student;

    const simulation = findOwnedSimulationOrError(studentId, simulationId);
    if (isError(simulation)) return simulation;

    const exam = simulation.universeData.exams.find(e => e.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist' };
    }

    return {
        examId:              exam.examId,
        studyHoursCompleted: exam.studyHoursCompleted,
        requiredStudyHours:  exam.requiredStudyHours,
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
    const student = findStudentOrError(studentId);
    if (isError(student)) return student;

    const simulation = findOwnedSimulationOrError(studentId, simulationId);
    if (isError(simulation)) return simulation;

    // CRITERIA 5: Simulation must be ACTIVE
    if (simulation.simulationStatus !== 'ACTIVE') {
        return { error: 'SIMULATION_ENDED', message: 'Cannot attempt exams in a completed simulation' };
    }

    // Check exam exists
    const exam = simulation.universeData.exams.find(sim => sim.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist'};
    }

    // CRITERIA 3: Prevent re-attempt
    if (exam.examStatus === 'ATTEMPTED') {
        return { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this exam'};
    }

    // apply 30 energy cost — clamped to 0
    simulation.energy = simulation.energy - 30;
    if (simulation.energy < 0) {
        simulation.energy = 0;
    }

    // CRITERIA 3: Determine pass or fail
    exam.examStatus = 'ATTEMPTED';
    // CRITERIA 2
    if (exam.studyHoursCompleted >= exam.requiredStudyHours) {
        exam.examOutcome = 'PASS';
    } else {
        exam.examOutcome = 'FAIL';
    }

    // CRITERIA 4
    // This line gets all the exams that belong to the same
    // course as the exam just attempted. Goes through every
    // exam in the simulation and keeps only the ones where
    // courseId matches the courseId of the exam that was
    // just attempted.
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

    // CRITERIA 5
    // checkWinLoseConditions updates the simulationStatus
    // directly on the simulation object in src/dataStore.js.
    // The next time someone calls examAttemptRecord or
    // simulationApplyAction, they will see the updated status.
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

export { examStudyProgress, examAttemptRecord };