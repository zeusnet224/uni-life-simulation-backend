// Shared type definitions for Unigotchi's core data model

export type SimulationStatus = 'ACTIVE' | 'GRADUATED' | 'DROPPED_OUT';
export type CourseStatus = 'ACTIVE' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';
export type ExamStatus = 'NOT_ATTEMPTED' | 'ATTEMPTED';
export type ExamOutcome = 'NIL' | 'PASS' | 'FAIL';
export type ActionType = 'DOOM_SCROLLING' | 'STUDYING' | 'SLEEPING' | 'EATING' | 'EXERCISING';

export interface Session {
  session: string;
  studentId: string;
}
export interface Student {
  studentId: string;
  password: string;
  nameFirst: string;
  nameLast: string;
}

export interface SocialConnection {
  connectionId: string;
  simulationId: number;
  name: string;
  closeness: number; // 1-5
  createdAt: number; // simulation timeElapsed at creation
}

export interface Course {
  courseId: string;
  name: string;
  courseDetails?: string;
  courseStatus: CourseStatus;
}

export interface Exam {
  examId: string;
  courseId: string;
  name: string;
  requiredStudyHours: number;
  studyHoursCompleted: number;
  studyProgress: number;
  examStatus: ExamStatus;
  examScore: number;
  examOutcome: ExamOutcome;
}

export interface Society {
  societyId: string;
  name: string;
  description: string;
}

export interface UniverseData {
  courses: Course[];
  exams: Exam[];
  societies: Society[];
  clubs?: unknown[];
}

export interface ActionHistoryEntry {
  action: ActionType;
  duration: number;
  startTime: number;
  endTime: number;
  examId: string | null;
}

export interface Simulation {
  simulationId: number;
  studentId: string;
  simulationStatus: SimulationStatus;
  currentActivity: string;
  energy: number;
  happiness: number;
  timeElapsed: number;
  actionHistory: ActionHistoryEntry[];
  joinedSocieties: string[];
  universeData: UniverseData;
}

export interface AppData {
  users: Student[];
  simulations: Simulation[];
  sessions: Session[];
  socialConnections: SocialConnection[];
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// Every function that can fail returns this shape on error
export type Result<T> = T | ErrorResponse;

// Used later (Express routes) to throw errors that get caught and mapped
// to an HTTP status + JSON body at the route layer, per iteration 2 spec.
export class UnigotchiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'UnigotchiError';
  }
}