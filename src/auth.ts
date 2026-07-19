import { getData } from './dataStore.js';
import { Student, Result } from './types.js';
import crypto from 'crypto';


interface AuthResult {
  session: string;
}

/** Regex to validate a first or last name */
const NAME_REGEX = /^[a-zA-Z \-']+$/;

/** Regex to valid UNSW ZID */
const ZID_REGEX = /^z\d{7}$/;

function validatePassword(password: string): boolean {
  const passAlpha = /[a-zA-Z]/.test(password);
  const passDigit = /[0-9]/.test(password);
  if (password.length < 8 || !passAlpha || !passDigit) {
    return false;
  } else {
    return true;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createSession(studentId: string): string {
  const data = getData();
  const session = crypto.randomUUID();
  data.sessions.push({ session, studentId});
  return session;
}


function getStudentIdFromSession(session: string): string | undefined {
  const data = getData();
  const entry = data.sessions.find(s => s.session === session);
  return entry ? entry.studentId : undefined ;

}
/**
 * Registers a new student with a student ID, password, and names.
 * @param {string} studentId must be lowercase z followed by exactly 7 digits (e.g. z5555555)
 * @param {string} password must be at least 8 characters and contain at least one letter and one number
 * @param {string} nameFirst must be 2-20 characters using only letters, spaces, hyphens or apostrophes
 * @param {string} nameLast must be 2-20 characters using only letters, spaces, hyphens or apostrophes
 * @returns {{ studentId }} on success
 * Errors: INVALID_STUDENT_ID, INVALID_FIRST_NAME, INVALID_LAST_NAME, INVALID_PASSWORD
 */
function authRegister(
  studentId: string,
  password: string,
  nameFirst: string,
  nameLast: string): Result<AuthResult> {
  const data = getData();

  if (!ZID_REGEX.test(studentId)) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID is not in the correct format' };
  }

  // studentId must not already be taken by another user
  for (const user of data.users) {
    if (user.studentId === studentId) {
      return { error: 'INVALID_STUDENT_ID', message: 'Student is already taken' };
    }
  }

  const nameF = NAME_REGEX.test(nameFirst);
  if (nameFirst.length < 2 || nameFirst.length > 20 || !nameF) {
    return { error: 'INVALID_FIRST_NAME', message: 'First name is not in the correct format' };
  }

  const nameL = NAME_REGEX.test(nameLast);
  if (nameLast.length < 2 || nameLast.length > 20 || !nameL) {
    return { error: 'INVALID_LAST_NAME', message: 'Last name is not in the correct format' };
  }

  if (!validatePassword(password)) {
    return { error: 'INVALID_PASSWORD', message: 'Password is not in the correct format' };
  }

  data.users.push({
    studentId,
    password: hashPassword(password),
    nameFirst,
    nameLast,
  });

  const session = createSession(studentId);
  return { session };
}

// Logs in a registered student given their studentId and password.
// Both studentId and password must match a registered user exactly.
// Returns { studentId } on success
// Errors: INVALID_CREDENTIALS if studentId does not exist or password is incorrect
function authLogin(studentId: string, password: string): Result<AuthResult> {
  const data = getData();
  const user = data.users.find(u => u.studentId === studentId);
  if (user === undefined) {
    return { error: 'INVALID_CREDENTIALS', message: 'Student ID does not exist' };
  }

  if (user.password !== hashPassword(password)) {
    return { error: 'INVALID_CREDENTIALS', message: 'Password is incorrect' };
  }
  const session = createSession(studentId);
  return { session };
}


export { authRegister, authLogin, getStudentIdFromSession};
