import { getData } from './dataStore.js';

// Returns the study progress from a simulation
/*
- Takes exam from a given simulation
- Does not advance timeElapsed or change currentActivity
- Pass condition: studyHoursCompleted >= requiredStudyHours
*/

function examStudyProgress(simulationId, studentId, examId) {
    const data = getData();

    const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
    if (!simulation) {
        return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
    }

    const exam = simulation.exams.find(e => e.examId === examId);
    if (!exam) {
        return { error: 'INVALID_EXAM', message: 'Exam ID does not exist'};
    }

    return {
        examId: exam.examId,
        studyProgress: exam.studyHoursCompleted,
        requiredStudyHours: exam.requiredStudyHours,
        //status for if study progress hours has passed required hours (whether or not they will pass)
        ready: (exam.studyProgress >= exam.requiredStudyHours)
    };
}


// Takes in a studentId and examId and records the attempt for this exam
function examAttemptRecord(examId, simulationId, studentId) {
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

    if (exam.examStatus === "ATTEMPTED") {
        return { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this exam'};
    }
    exam.examStatus = "ATTEMPTED";

    const passed = exam.studyHoursCompleted >= exam.requiredStudyHours;
    if (passed) {
        exam.examOutcome = 'PASS';
    } else {
        exam.examOutcome = 'FAIL';
    }

    //energy cost -30
    simulation.energy = simulation.energy - 30;

    //check if all the exams have been completed and update courseStatus
    const courseExams = simulation.exams.filter(e => e.courseId === exam.courseId);

    //get course to update its status
    const course = simulation.courses.find(c => c.courseId === exam.courseId);

    const allAttempted = courseExams.every(e => e.examStatus !== "NOT_ATTEMPTED");
    if (allAttempted) {
        const totalExams = courseExams.length;
        const totalPassed = courseExams.filter(e => e.isPassed === true).length;

        // PASSED: all attempted AND at least 50% passed
        if (totalPassed / totalExams >= 0.5) {
            course.courseStatus = 'PASSED';
        } else {
            course.courseStatus = 'FAILED';
        }
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