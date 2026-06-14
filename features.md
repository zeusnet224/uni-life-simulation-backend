# Unigotchi Feature Design

Use this file for your Iteration 0 feature design and function interface table.

Your tutor will mark this file against the provided requirements backlog and prescribed function table in the project specification. Read the Iteration 0 specification before completing this file.

## Feature Design Summary

Complete this section before writing your function interface table. Use the provided requirements backlog in the specification to decide which features your interface needs to support.

| Feature | Related story/stories | What the feature allows the student/system to do | State/data needed |
| ------- | --------------------- | ----------------------------------------------- | ----------------- |
| View simulation progress | Story 1 | Retrieve current simulation status and progress information | Simulation status, activity, stats, elapsed time, exam study progress |
| View courses and exams | Story 3 | Fetch relevant information regarding courses and exams in a read-only state | Simulation id, available courses, exam study requirements, course/exam details |
| Join and interact with university societies | Story 5 | Allows the student to browse available societies, join one, and attend meetings which affect their happiness and energy stats | Available societies list, student's current society membership, happiness stat, energy stat |
|  |  |  |  |

## Function Interface Table

Your table must include:
- the prescribed functions from the specification, and
- your designed functions for the rest of the provided requirements backlog.

Use the same table format as the prescribed interface table in the specification. Your function names, parameters, and return objects for designed functions do not need to match other groups exactly, but the table must be complete enough to satisfy the provided acceptance criteria.

| Name & Description | Data Types |
| ------------------ | ---------- |
| simulationList: Returns a list of all simulations instances for a student, with a summary. | Parameters: (studentId) <br> Return Object: {simulations: [ {simulationId: simulationStatus: 'ACTIVE', currentActivity: 'STUDYING', timeElapsed:5} ] } |
| clear: Resets the state of the application back to the start | Parameters: () no parameters <br> Return Object: {} empty object |
| courseRetrieveCourses: returns a list of all courses in that simulation's universe | Parameters: (simulationId) <br> Return Object: {courses: [{courseId: 'COMP1531', name: 'Software Engineering fundementals', courseDetails: 'This course teaches the fundementals of Software Engineering'}]} |
| courseRetrieveExams: returns a list of all exams and their study requirements | Parameters: (simulationId) <br> Return Object: {exams: [{examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'COMP1531 project Iteration 0', requiredStudyHours: 10, examDetails: 'first iteration of the COMP1531 project'}]} |
| courseRetrieveCourseDetails: returns all relevant and usefull details about the course | Parameters: (courseId) <br> Return Object: {courses: [{courseId: 'COMP1531', name: 'Software Engineering fundementals', courseDetails: 'This course teaches the fundementals of Software Engineering'}]} |
| courseRetrieveExamDetails: returns all relevant and usefull details about the exam | Parameters: (examId) <br> Return Object: {exams: [{examId: 'E1-COMP1531', courseId: 'COMP1531', name: 'COMP1531 project Iteration 0', requiredStudyHours: 10, examDetails: 'first iteration of the COMP1531 project'}]} |
| societyList: Returns a list of all available societies a student can join. | Parameters: (studentId) Return object: {societies: [{societyId, name, description}]} |
| societyJoin: Joins a society, boosting the student's social stat and setting their active society. | Parameters: (studentId, societyId) Return object: {societyId, name, social} |
| societyAttend: Attends a society meeting, increasing happiness and decreasing energy. | Parameters: (studentId) Return object: {happiness, energy} |