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
      studentId: string,
      password: string,
      nameFirst: string,
      nameLast: string
    }
  ],

  simulations: [
    {
      simulationId: number,
      simulationStatus: string,
      currentActivity: string,
      energy: number,
      happiness: number,
      timeElapsed: number,
      studyHoursCompleted: number,
    }
  ],
}

let universeData = {
  courses = [
    {
    courseId: string,
    name: string,
    courseDetails: string,
    courseStatus: string
    }
  ],

  exams = [
    {
      examId: string,
      courseId: string,
      name: string,
      requiredStudyHours: number,
      examDetails: string,
      studyProgress: number,
      attempt: string
      examStatus: string,
      examScore: number,
      examOutcome: string
    }
  ]
}
```
## Notes

<!-- Add any notes or considerations about your data structure design here -->

the course and exam data structures are basically the same as in the specifications but with the addition of course details and exam details respectively to allign with the required criteria in story 3
