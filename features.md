# Unigotchi Feature Design

Use this file for your Iteration 0 feature design and function interface table.

Your tutor will mark this file against the provided requirements backlog and prescribed function table in the project specification. Read the Iteration 0 specification before completing this file.

## Feature Design Summary

Complete this section before writing your function interface table. Use the provided requirements backlog in the specification to decide which features your interface needs to support.

| Feature | Related story/stories | What the feature allows the student/system to do | State/data needed |
| ------- | --------------------- | ----------------------------------------------- | ----------------- |
| View simulation progress | Story 1 | Retrieve current simulation status and progress information | Simulation status, activity, stats, elapsed time, exam study progress |
| Perform wellbeing and study actions | Story 2 | Apply actions to a simulation to update energy, happiness, and study progress | Current activity, duration, examId, energy, happiness, timeElapsed, simulation status |
| View courses and exams | Story 3 | Fetch relevant information regarding courses and exams in a read-only state | Simulation id, available courses, exam study requirements, course/exam details |
| Join and interact with university societies | Story 5 | Allows the student to browse available societies, join one, and attend meetings which affect their happiness and energy stats | Available societies list, student's current society membership, happiness stat, energy stat |
| View study progress | Story 4  | Retrieve the study progress made towards relevant exams | Simulation, Study progress, exam, exam progress |
| Record exam attempt | Story 4 | Record exam attempt and determine whether the exam was passed | Exam, exam outcome, exam progress |
| Determines course completion | Story 4 | Determines if a course has been completed when all exams in a course has been passed | Course, course progress, exam, exam outcome, exam progress |
| View final simulation status | Story 4 | Observes the final simulation status at graduation or drop-out condition | Simulation status, condition |

## Function Interface Table

Your table must include:
- the prescribed functions from the specification, and
- your designed functions for the rest of the provided requirements backlog.

Use the same table format as the prescribed interface table in the specification. Your function names, parameters, and return objects for designed functions do not need to match other groups exactly, but the table must be complete enough to satisfy the provided acceptance criteria.

| Name & Description | Data Types | Error Returns|
| ------------------ | ---------- | -------------|
| simulationList: Returns a list of all simulations instances for a student, with a summary. | Parameters: (studentId) <br> Return Object: {simulations: [ {simulationId: simulationStatus: 'ACTIVE', currentActivity: 'STUDYING', timeElapsed:5} ] } |
| `simulationApplyAction` <br><br> Given a valid action and duration, applies the action to a simulation and updates energy, happiness, timeElapsed, and study progress. | Parameters: <br> `( studentId, simulationId, action, duration, examId )` <br><br> Return object: <br> `{` <br> `simulationId: 1,` <br> `currentActivity: 'STUDYING',` <br> `duration: 1,` <br> `energy: 75,` <br> `happiness: 60,` <br> `timeElapsed: 1` <br> `}` |
| `examGetStudyAction` <br><br> Given a studying action, identifies and returns which exam is being studied for. | Parameters: <br> `( studentId, simulationId )` <br><br> Return object: <br> `{` <br> `examId: 'E2-COMP1531',` <br> `name: 'Midterm quiz',` <br> `duration: 2` <br> `}` |
| `simulationGetLastAction` <br><br> Returns the most recently applied action and how long it lasted, so the caller can determine what action was applied and its duration. | Parameters: <br> `( studentId, simulationId )` <br><br> Return object: <br> `{` <br> `currentActivity: 'STUDYING',` <br> `duration: 2,` <br> `timeElapsed: 12` <br> `}` |
| `simulationGetconcludingNotification` <br><br> Returns the final simulation status and a notification when the simulation has reached GRADUATED or DROPPED_OUT, making it possible to observe that no further actions should be applied. | Parameters: <br> `( studentId, simulationId )` <br><br> Return object: <br> `{` <br> `simulationStatus: 'GRADUATED',` <br> `notification: 'This simulation is completed'` <br> `}` |
| clear: Resets the state of the application back to the start | Parameters: () no parameters <br> Return Object: {} empty object |
| courseRetrieveCourses: returns a list of all courses in that simulation's universe | Parameters: (simulationId) <br> Return Object: {courses: [{courseId: 'COMP1531', name: 'Software Engineering fundementals', courseDetails: 'This course teaches the fundementals of Software Engineering'}]} | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. |
| courseRetrieveExams: returns a list of all exams and their study requirements | Parameters: (simulationId) <br> Return Object: {exams: [{examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'COMP1531 project Iteration 0', requiredStudyHours: 10, examDetails: 'first iteration of the COMP1531 project'}]} | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. |
| courseRetrieveCourseDetails: returns all relevant and usefull details about the course | Parameters: (courseId) <br> Return Object: {courses: [{courseId: 'COMP1531', name: 'Software Engineering fundementals', courseDetails: 'This course teaches the fundementals of Software Engineering'}]} | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. <br><br>`INVALID_COURSE` <br> Course ID does not refer to a valid course. |
| courseRetrieveExamDetails: returns all relevant and usefull details about the exam | Parameters: (examId) <br> Return Object: {exams: [{examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'COMP1531 project Iteration 0', requiredStudyHours: 10, examDetails: 'first iteration of the COMP1531 project'}]} | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. <br><br> `INVALID_EXAM`<br>Exam ID does not refer to a valid exam. |
| `societyList`: Returns a list of all available societies a student can join. | 	`Parameters: (studentId)` <br><br>`Return Object:` <br> `{societies:` <br>`[{societyId,` <br> `name`, <br> `description}]` | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. <br><br> `INVALID_STUDENT_ID` <br>Student ID does not refer to a valid registered student. |
| `societyJoin`: Joins a society, boosting the student's social stat and setting their active society. | `Parameters:` <br> `(studentId, societyId)`<br><br> `Return Object:`<br> `{societyId,`<br> `name,`<br> `social}` | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. <br><br> `INVALID_STUDENT_ID` <br>Student ID does not refer to a valid registered student. <br><br>`INVALID_SOCIETY` <br> Society ID does not refer to a valid society.<br>Student has already joined the given society. |
| `societyAttend:` Attends a society meeting, increasing happiness and decreasing energy. | `Parameters:`<br> `(studentId)`<br><br> `Return Object:`<br> `{happiness,` <br> `energy}` | `INVALID_SIMULATION` <br> Simulation ID does not refer to a valid simulation. <br><br> `INVALID_STUDENT_ID` <br>Student ID does not refer to a valid registered student. <br><br>`INVALID_SOCIETY` <br> Society ID does not refer to a valid society.<br>Student has not joined the given society. <br><br> `INVALID_DURATION` Duration must be greater than 0 and less than or equal to 4 hours. |
| `examStudyProgress` <br><br> Given a simulation has exam progress, return study progress | Parameters: <br> ```( simulationId, studyHoursCompleted )``` <br><br> Return object: <br/> `{` <br> `examId: 'E2-COMP1531',` <br>  `studyProgress: 60` <br> `}`|
| `examAttemptRecord` <br><br> Given a valid exam attempt, record the attempt and determine the exam outcome | Parameters: <br> ```( examId, attempt, studentId )``` <br><br> Return object: <br/> `{` <br> `examStatus: 'ALREADY_ATTEMPTED',` <br> `examScore: 51,` <br> `examOutcome: 'PASSED'` <br> `}` |
| `examPreventReattempt` <br><br> Prevents the exam from being attempted again | Parameters: <br> ```( examId, attempt, studentId )``` <br><br> Return object: <br/> `{` `examID: 'E1-COMP1531,` <br> `examStatus: 'ALREADY_ATTEMPTED'` <br> `}` |
| `courseCompletion` <br><br> Determines if a course has been completed | Parameters: <br> ```( courseId, studentId )``` <br><br> Return object: <br/>  `{` <br> `courseId: 'COMP1531',` <br> `courseStatus: 'COMPLETED'` <br> `}`
| `simulationStatus` <br><br> Get the current status and stats of a specific simulation | Parameters: <br> ```( studentId, simulationId )``` <br><br> Return object: <br/> `{` <br> `simulationStatus: 'ACTIVE',` <br> `currentActivity: 'DOOM_SCROLLING',` <br> `energy: 75,` <br> `happiness: 60,` <br> `timeElapsed: 1,` `}` | `INVALID_STUDENT_ID` Student ID does not refer to a valid registered student. <br><br>`INVALID_SIMULATION` Simulation ID does not refer to a valid simulation.<br>Simulation does not belong to the given student ID. |
