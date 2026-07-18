# Iteration 1 Reflection

Note: you may refer to your group contract during this reflection. It is natural to add/remove/edit requirements as you progress through the project.

| zID      | Name           |
| -------- | -------------- |
| z5712149 | Saniya D'souza |
| z5684911 | Katrina Chung  |
| z5687882 | Laya Madhan    |
| z5767731 | Rami Khaldoon  |
| z5692447 | Athena Lam     |

## Who worked on what functions for this iteration?

* Athena: Implemented `simulationStatus`, `courseRetrieveCourses`, `courseRetrieveExams`, `courseRetrieveCourseDetails`, `courseRetrieveExamDetails`, and `courseCompletion`.
* Katrina: Implemented `societyAction`, `societyJoin`, and `societyAttend`. Also wrote tests for society, course, and simulation status functions.
* Rami: Implemented `simulationCreate` and `clear`, including default simulation setup, datastore reset behaviour, and tests for both functions.
* Saniya: Worked on authentication functions, including student registration, login, validation, and related tests.
* Laya: Worked on exam-related functions, including study progress, exam attempts, exam outcomes, and related tests.

## What went well for your group this iteration?

* Work was divided clearly by feature area.
* Core backend functions for authentication, simulations, courses, societies, and exams were implemented.
* Tests were added for both successful cases and error cases.
* The shared datastore allowed different features to work together across files.

## What didn't go well for your group this iteration?

* Some different assumptions about datastore fields and default values were made, which made merge conflicts more likely.
* Merge conflicts occurred when related files were edited by multiple people.
* Some functions were harder to test because they depended on setup from other functions.
* Import/export issues caused extra debugging time.

## What could you do better next iteration?

* Agree on the datastore structure and field names before implementation.
* Communicate before editing the same files.
* Write tests alongside each function instead of after implementation.
* Run the full test suite before merging changes.
* Use smaller commits or merge requests to make review easier.
