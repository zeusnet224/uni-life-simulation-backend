import express, { json, Request, Response } from 'express';
import { echo } from './newecho.js';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import process from 'process';
import { authRegister, authLogin } from './auth.js';
import { clearData } from './dataStore.js';
import { socialConnectionCreate, socialConnectionsList, socialConnectionRemove } from './socialConnections.js';
import { getStudentIdFromSession } from './auth.js';

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

app.get('/', (req: Request, res: Response) => res.json({ message: 'Server is running' }));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || '127.0.0.1';

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
  clearData();
  res.json({});
});

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
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => {
    console.log('Shutting down server gracefully.');
    process.exit();
  });
});

export { server };
