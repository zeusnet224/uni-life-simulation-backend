# Data Structure Design

> **Note:** This is a Markdown file (`.md`), not a JavaScript file. You should 
> design your data structure here using a code block, then implement it in 
> `src/dataStore.js` in later iterations.
> For more information on using code blocks in Markdown, see the [Markdown Guide on Fenced Code Blocks](https://www.markdownguide.org/extended-syntax/#fenced-code-blocks).

## Data Structure

```javascript
// TODO: Design your data structure here
// Replace the empty object below with your data structure design
// Include at least ONE example user and ONE example simulation
let data = {
  users: [
    {
      studentId: 'z568910',
      password: 'ILoveComp1531',
      nameFirst: 'John',
      nameLast: 'Smith'
    }
  ],

  simulations: [
    {
      simulationId: '10471',
      simulationStatus: 'ACTIVE',
      currentActivity: 'STUDYING',
      energy: 10,
      happiness: 6,
      timeElapsed: 100,
      studyHoursCompleted: 2
    }
  ],
}

let universeData = {
  courses = [
    {
    courseId: 'COMP1531',
    name: 'Software Engineering Fundamentals',
    courseDetails: 'Software engineering principles',
    courseStatus: 'ACTIVE'
    }
  ],

  exams = [
    {
      examId: 'E2-COMP1531',
      courseId: 'COMP1531',
      name: 'Final Exam',
      requiredStudyHours: 20,
      examDetails: 'Held in Flute Lab',
      studyProgress: 2,
      examStatus: 'NOT_ATTEMPTED',
      examScore: 0,
      examOutcome: 'NIL'
    }
  ]
}
```
## Notes

<!-- Add any notes or considerations about your data structure design here -->

the course and exam data structures are basically the same as in the specifications but with the addition of course details and exam details respectively to allign with the required criteria in story 3
