import { getData } from './dataStore.js';
import { Student, Result } from './types.js';

interface AuthResult {
  studentId: string;
}

// A name is valid if it is 2-20 characters long and contains only
// letters, spaces, hyphens, or apostrophes.
function isValidName(name: string): boolean {
  const validCharacters = /^[a-zA-Z \-']+$/.test(name);
  return name.length >= 2 && name.length <= 20 && validCharacters;
}

// A password is valid if it is at least 8 characters long and contains
// at least one letter and at least one digit.
function isValidPassword(password: string): boolean {
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return password.length >= 8 && hasLetter && hasDigit;
}

// A studentId is valid in format if it is a lowercase 'z' followed by
// exactly 7 digits (e.g. z5555555).
function isValidStudentIdFormat(studentId: string): boolean {
  return /^z\d{7}$/.test(studentId);
}

// True if a student with this studentId is already registered.
function isStudentIdTaken(studentId: string): boolean {
  const data = getData();
  return data.users.some(user => user.studentId === studentId);
}

// Registers a new student with a student ID, password, and names.
// studentId must be lowercase z followed by exactly 7 digits (e.g. z5555555)
// nameFirst and nameLast must be 2-20 characters using only letters, spaces, hyphens or apostrophes
// password must be at least 8 characters and contain at least one letter and one number
// Returns { studentId } on success
// Errors: INVALID_STUDENT_ID, INVALID_FIRST_NAME, INVALID_LAST_NAME, INVALID_PASSWORD
function authRegister(
  studentId: string,
  password: string,
  nameFirst: string,
  nameLast: string
): Result<AuthResult> {
  if (!isValidStudentIdFormat(studentId)) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID is not in the correct format' };
  }

  if (isStudentIdTaken(studentId)) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student is already taken' };
  }

  if (!isValidName(nameFirst)) {
    return { error: 'INVALID_FIRST_NAME', message: 'First name is not in the correct format' };
  }

  if (!isValidName(nameLast)) {
    return { error: 'INVALID_LAST_NAME', message: 'Last name is not in the correct format' };
  }

  if (!isValidPassword(password)) {
    return { error: 'INVALID_PASSWORD', message: 'Password is not in the correct format' };
  }

  const data = getData();
  const newStudent: Student = {
    studentId,
    password,
    nameFirst,
    nameLast,
  };
  data.users.push(newStudent);

  return { studentId };
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

  if (user.password !== password) {
    return { error: 'INVALID_CREDENTIALS', message: 'Password is incorrect' };
  }

  return { studentId };
}

export { authRegister, authLogin };