import express, { json, Request, Response } from 'express';
import { echo } from './newecho.ts';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import process from 'process';
import { authRegister, authLogin, getStudentIdFromSession } from './auth.ts';
import { clear } from './other.ts';
import { socialConnectionCreate, socialConnectionsList, socialConnectionRemove } from './socialConnections.ts';
import { societyList, societyJoin, societyAttend } from './society.ts';
import {
  simulationCreate,
  simulationStatus,
  simulationsList,
  examGetStudyAction,
  simulationGetLastAction,
  simulationGetConcludingNotification,
} from './simulation.ts';
import {
  courseRetrieveCourses,
  courseRetrieveExams,
  courseRetrieveCourseDetails,
  courseRetrieveExamDetails,
  courseCompletion,
} from './course.js';
import { simulationApplyAction } from './action.js';
import {
  opportunitiesList,
  opportunityJoin,
  opportunityLeave,
  opportunityApplyEffects,
} from './opportunity.js';
import { loadExistingData, saveData } from './dataStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// Set up web app
const app = express();

// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for logging errors (print to terminal)
app.use(morgan('dev'));

// Lists all opportunities and whether the student has joined them.
app.get(
  '/simulations/:simulationId/opportunities',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (studentId === undefined) {
      return;
    }

    const simulationId = Number(req.params.simulationId);
    const result = opportunitiesList(studentId, simulationId);

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

// Joins an opportunity without immediately applying its effects.
app.post(
  '/simulations/:simulationId/opportunities/:opportunityId/join',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (studentId === undefined) {
      return;
    }

    const simulationId = Number(req.params.simulationId);
    const opportunityId = req.params.opportunityId as string;

    const result = opportunityJoin(
      studentId,
      simulationId,
      opportunityId
    );

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

// Leaves an opportunity that the student previously joined.
app.delete(
  '/simulations/:simulationId/opportunities/:opportunityId/leave',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (studentId === undefined) {
      return;
    }

    const simulationId = Number(req.params.simulationId);
    const opportunityId = req.params.opportunityId as string;

    const result = opportunityLeave(
      studentId,
      simulationId,
      opportunityId
    );

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

// Applies the effects of a joined opportunity to a selected exam.
app.post(
  '/simulations/:simulationId/opportunities/:opportunityId/apply',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (studentId === undefined) {
      return;
    }

    const simulationId = Number(req.params.simulationId);
    const opportunityId = req.params.opportunityId as string;
    const { examId } = req.body;

    const result = opportunityApplyEffects(
      studentId,
      simulationId,
      opportunityId,
      examId
    );

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

app.get('/', (req: Request, res: Response) => res.json({ message: 'Server is running' }));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || '127.0.0.1';

function getAuthenticatedStudentId(
  req: Request,
  res: Response
): string | undefined {
  const session = req.header('session');

  if (!session) {
    res.status(401).json({
      error: 'UNAUTHORISED',
      message: 'No session provided',
    });
    return undefined;
  }

  const studentId = getStudentIdFromSession(session);

  if (!studentId) {
    res.status(401).json({
      error: 'UNAUTHORISED',
      message: 'Invalid session',
    });
    return undefined;
  }

  return studentId;
}

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================

// Example get request
app.get('/echo', (req: Request, res: Response) => {
  const result = echo(req.query.echo as string);

  if ('error' in result && result.error === 'INVALID_ECHO') {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// registers a new student and returns a session
app.post('/auth/register', (req: Request, res: Response) => {
  const { studentId, password, nameFirst, nameLast } = req.body;
  const result = authRegister(studentId, password, nameFirst, nameLast);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// logins a student
app.post('/auth/login', (req: Request, res: Response) => {
  const { studentId, password } = req.body;
  const result = authLogin(studentId, password);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// clears the data
app.delete('/clear', (req: Request, res: Response) => {
  const result = clear();
  return res.status(200).json(result);
});

// Creates a simulation for the authenticated student.
app.post('/simulations', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);

  if (!studentId) {
    return;
  }

  const { universeData } = req.body;

  const result = simulationCreate(studentId, universeData);

  if ('error' in result) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

// Lists all simulations owned by the authenticated student.
app.get('/simulations/:simulationId', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);

  if (!studentId) {
    return;
  }

  const simulationId = Number(req.params.simulationId);

  const result = simulationStatus(studentId, simulationId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }

    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

// Returns the current status of a simulation.
app.get('/simulations', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);

  if (!studentId) {
    return;
  }

  const result = simulationsList(studentId);

  if ('error' in result) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

// Returns the most recent action performed in a simulation.
app.get(
  '/simulations/:simulationId/last-action',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (!studentId) {
      return;
    }

    const simulationId = Number(req.params.simulationId);

    const result = simulationGetLastAction(studentId, simulationId);

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

// Returns details of the most recent study action in a simulation.
app.get(
  '/simulations/:simulationId/last-study-action',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (!studentId) {
      return;
    }

    const simulationId = Number(req.params.simulationId);

    const result = examGetStudyAction(studentId, simulationId);

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

// Returns the concluding notification for an ended simulation.
app.get(
  '/simulations/:simulationId/conclusion',
  (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req, res);

    if (!studentId) {
      return;
    }

    const simulationId = Number(req.params.simulationId);

    const result = simulationGetConcludingNotification(
      studentId,
      simulationId
    );

    if ('error' in result) {
      if (result.error === 'INVALID_SIMULATION') {
        return res.status(403).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  }
);

// creates a social connection for a simulation
app.post('/simulations/:simulationId/connections', (req: Request, res: Response) => {
  const session = req.header('session');
  if (!session) {
    return res.status(401).json({ error: 'UNAUTHORISED', message: 'No session provided' });
  }
  const studentId = getStudentIdFromSession(session);
  if (!studentId) {
    return res.status(401).json({ error: 'UNAUTHORISED', message: 'Invalid session' });
  }

  const simulationId = parseInt(req.params.simulationId as string);
  const { name, closeness } = req.body;
  const result = socialConnectionCreate(studentId, simulationId, name, closeness);
  if ('error' in result) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// lists all social connections for a simulation
app.get('/simulations/:simulationId/connections', (req: Request, res: Response) => {
  const session = req.header('session');
  if (!session) {
    return res.status(401).json({ error: 'UNAUTHORISED', message: 'No session provided' });
  }
  const studentId = getStudentIdFromSession(session);
  if (!studentId) {
    return res.status(401).json({ error: 'UNAUTHORISED', message: 'Invalid session' });
  }

  const simulationId = parseInt(req.params.simulationId as string);
  const result = socialConnectionsList(studentId, simulationId);
  if ('error' in result) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// removes a social connection from a simulation
app.delete('/simulations/:simulationId/connections/:connectionId', (req: Request, res: Response) => {
  const session = req.header('session');
  if (!session) {
    return res.status(401).json({ error: 'UNAUTHORISED', message: 'No session provided' });
  }
  const studentId = getStudentIdFromSession(session);
  if (!studentId) {
    return res.status(401).json({ error: 'UNAUTHORISED', message: 'Invalid session' });
  }

  const simulationId = parseInt(req.params.simulationId as string);
  const connectionId = req.params.connectionId as string;
  const result = socialConnectionRemove(studentId, simulationId, connectionId);
  if ('error' in result) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// lists societies not yet joined in a simulation
app.get('/simulations/:simulationId/societies', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const result = societyList(studentId, simulationId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// joins a society in a simulation
app.post('/simulations/:simulationId/societies/:societyId/join', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const societyId = req.params.societyId as string;
  const result = societyJoin(studentId, simulationId, societyId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// attends a joined society for a duration
app.post('/simulations/:simulationId/societies/:societyId/attend', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const societyId = req.params.societyId as string;
  const { duration } = req.body;
  const result = societyAttend(studentId, simulationId, societyId, duration);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// lists all courses in a simulation
app.get('/simulations/:simulationId/courses', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const result = courseRetrieveCourses(simulationId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// lists all exams in a simulation
app.get('/simulations/:simulationId/exams', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const result = courseRetrieveExams(simulationId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// returns full details for a specific course
app.get('/simulations/:simulationId/courses/:courseId', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const courseId = req.params.courseId as string;
  const result = courseRetrieveCourseDetails(courseId, simulationId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// returns full details for a specific exam
app.get('/simulations/:simulationId/exams/:examId', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const examId = req.params.examId as string;
  const result = courseRetrieveExamDetails(simulationId, examId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

// returns the completion status of a course for the student
app.get('/simulations/:simulationId/courses/:courseId/completion', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const courseId = req.params.courseId as string;
  const result = courseCompletion(courseId, studentId, simulationId);

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

app.post('/simulations/:simulationId/action', (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req, res);
  if (!studentId) return;

  const simulationId = Number(req.params.simulationId);
  const { action, duration, examId } = req.body;

  const result = simulationApplyAction(
    studentId,
    simulationId,
    action,
    duration,
    examId
  );

  if ('error' in result) {
    if (result.error === 'INVALID_SIMULATION') {
      return res.status(403).json(result);
    }

    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

app.use((req: Request, res: Response) => {
  const message = `
    Route not found - This could be because:
      0. You have defined routes below (not above) this middleware in server.ts
      1. You have not implemented the route ${req.method} ${req.path}
      2. There is a typo in either your test or server, e.g. /posts/list in one
         and, incorrectly, /post/list in the other
      3. You are using 'npm start' (instead of 'npm run dev') to start your server and
         have forgotten to manually restart to load the new changes
      4. You've forgotten a leading slash (/), e.g. you have posts/list instead
         of /posts/list in your server.ts or test file
  `;

  res.status(404).json({ error: 'ROUTE_NOT_FOUND', message });
});

// start server
loadExistingData();
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  saveData();

  server.close(() => {
    console.log('Shutting down server gracefully.');
    process.exit();
  });
});

export { server };
