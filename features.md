# Unigotchi Feature Design

Use this file for your Iteration 0 feature design and function interface table.

Your tutor will mark this file against the provided requirements backlog and prescribed function table in the project specification. Read the Iteration 0 specification before completing this file.

## Feature Design Summary

Complete this section before writing your function interface table. Use the provided requirements backlog in the specification to decide which features your interface needs to support.

| Feature | Related story/stories | What the feature allows the student/system to do | State/data needed |
| ------- | --------------------- | ----------------------------------------------- | ----------------- |
| Example: View simulation progress | Story 1 | Retrieve current simulation status and progress information | Simulation status, activity, stats, elapsed time, exam study progress |
| View study progress | Story 4  | Retrieve the study progress made towards relevant exams | Simulation, Study progress, exam, exam progress |
| Record exam attempt | Story 4 | Record exam attempt and determine whether the exam was passed | Exam, exam outcome, exam progress |
| Determines course completion | Story 4 | Determines if a course has been completed when all exams in a course has been passed | Course, course progress, exam, exam outcome, exam progress |
| View final simulation status | Story 4 | Observes the final simulation status at graduation or drop-out condition | Simulation status, condition |

## Function Interface Table

Your table must include:
- the prescribed functions from the specification, and
- your designed functions for the rest of the provided requirements backlog.

Use the same table format as the prescribed interface table in the specification. Your function names, parameters, and return objects for designed functions do not need to match other groups exactly, but the table must be complete enough to satisfy the provided acceptance criteria.

| Name & Description | Data Types |
| ------------------ | ---------- |
| `retrieveStudyProgress` <br><br> Given a simulation has exam progress, return study progress | Parameters: <br> ```( simulationId, examProgress )``` <br><br> Return object: <br/> ```exams: [ { examId: 'E2-COMP1531', studyProgress: 60 } ]```|
| `recordExamAttempt` <br><br> Given a valid exam attempt, record the attempt and determine the exam outcome | Parameters: <br> ```( examId, attempt )``` <br><br> Return object: <br/> ```exams: [ { examStatus: 'ALREADY_ATTEMPTED', examScore: 51, examOutcome: 'PASSED' } ]``` |
| `preventReattempt` <br><br> Prevents the exam from being attempted again | Parameters: <br> ```( examId, attempt )``` <br><br> Return object: <br/> ``` exams: [ { examID: 'E1-COMP1531, examStatus: 'ALREADY_ATTEMPTED' } ]``` |
| `retrieveCourseCompletion` <br><br> Determines if a course has been completed | Parameters: <br> ```( examId, examOutcome, courseId )``` <br><br> Return object: <br/> ``` course: [ { courseId: 'COMP1531', courseStatus: 'COMPLETED'} ]```
| `retrieveFinalSimulationStatus` <br><br> Observes the final simulation status when it reaches a graduation or drop-out condition | Parameters: <br> ```( studentId, simulationId )``` <br><br> Return object: <br/> ``` simulations: [ { simulationStatus: 'GRADUATED', currentActivity: 'SLEEPING', energy: 67, happiness: 50, timeElapsed: 1469, studyHoursCompleted: 500} ]``` |
