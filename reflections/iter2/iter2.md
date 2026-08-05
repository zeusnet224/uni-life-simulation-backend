# Iteration 2 Reflection

Note: you may refer to your group contract during this reflection.

| zID      | Name           |
| -------- | -------------- |
| z5712149 | Saniya D'souza |
| z5684911 | Katrina Chung  |
| z5687882 | Laya Madhan    |
| z5767731 | Rami Khaldoon  |
| z5692447 | Athena Lam     |

## Who worked on which routes or features this iteration?

Prescribed Iteration 2 routes from `swagger.yaml`:
- POST `/auth/register`: Laya
- POST `/auth/login`: Saniya
- GET `/simulations`: Rami
- POST `/simulations`: Rami
- GET `/simulations/{simulationId}`: Rami
- POST `/simulations/{simulationId}/action`: Rami
- GET `/simulations/{simulationId}/exams`: Athena
- GET `/simulations/{simulationId}/exams/{examId}`: Athena
- POST `/simulations/{simulationId}/exams/{examId}/take`: Rami
- DELETE `/clear`: Rami

Designed Iteration 2 routes/features:
- GET `/simulations/{simulationId}/advisor/plan:`: Laya
- POST `/simulations/{simulationId}/connections`: Saniya
- DELETE `/simulations/{simulationId}/connections/{connectionId}:`: Saniya
- DELETE `/simulations/{simulationId}/connections/{connectionId}`: Saniya
- POST `/simulations/{simulationId}/wellbeing:`: Athena
- GET `/simulations/{simulationId}/recommendation:`: Athena
- GET `/simulations/{simulationId}/opportunities:`: Rami
- POST `/simulations/{simulationId}/opportunities/{opportunityId}/join:`: Rami
- DELETE `/simulations/{simulationId}/opportunities/{opportunityId}/leave:`: Rami
- POST `/simulations/{simulationId}/opportunities/{opportunityId}/apply:`: Rami
- GET `/simulations/{simulationId}/exams/{examId}/readiness:`: Katrina

## What went well for your group this iteration?

* There were no merge conflicts during this Iteration's implementation.
* Core backend functions for authentication, simulations, courses, societies, and exams were implemented successfully.
* Tests were added for both successful cases and error cases without any issues.
* Our CI pipeline (lint, typecheck, and a server-backed test stage) caught regressions early and kept
  master green through the iteration.
* The features.md traceability table gave us a clear story-by-story view of progress, which made this
  final check-in fast.

## What didn't go well for your group this iteration?

* There were more local problems with work rather than remote however
this was easily sorted out by helping each other (e.g. lint testing and npm
install errors)
* Asking each other to approve merge requests was difficult since our
schedules weren't aligned which slowed progression

## What could you do better next iteration?

* Communicate before merging the same files to avoid conflicts.
* Push less merge requests to avoid conflicts when making small changes
* Use smaller commits or merge requests to make review easier.
* We should keep swagger.yaml and features.md tidy continuously, with consistent tags and no
  duplicate rows, rather than cleaning them up right before submission.
* We should start implementation and testing earlier with smaller, more frequent merge requests, so
  no single story is rushed at the end.