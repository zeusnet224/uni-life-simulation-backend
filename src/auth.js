import { getData } from './dataStore.js';

// Register a student with a student ID, password, and names, then return their student ID
function authRegister(studentId, password, nameFirst, nameLast) {
  const data = getData();

  if (!/^z\d{7}$/.test(studentId)) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID must be a lowercase z followed
                by exactly 7 digits' };
  }

  const existingUser = data.users.find(u => u.studentId === studentId);
  if (existingUser) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID is already taken' };
  }

  if (nameFirst.length < 2 || nameFirst.length > 20) {
    return { error: 'INVALID_FIRST_NAME', message: 'First name must be 2-20 characters' };
  }

  if (!/^[a-zA-Z '\-]+$/.test(nameFirst)) {
    return { error: 'INVALID_FIRST_NAME', message: 'First name contains invalid characters' };
  }

  if (nameLast.length < 2 || nameLast.length > 20) {
    return { error: 'INVALID_LAST_NAME', message: 'Last name must be 2-20 characters' };
  }

  if (!/^[a-zA-Z '\-]+$/.test(nameLast)) {
    return { error: 'INVALID_LAST_NAME', message: 'Last name contains invalid characters' };
  }

  if (password.length < 8) {
    return { error: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters' };
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: 'INVALID_PASSWORD', message: 'Password must contain at least one letter and
                one number' };
  }

  data.users.push({ studentId, password, nameFirst, nameLast });
  return { studentId };
}

// Given a registered student ID and password, return their student ID
function authLogin(studentId, password) {
  const data = getData();

  const user = data.users.find(u => u.studentId === studentId);
  if (!user || user.password !== password) {
    return { error: 'INVALID_CREDENTIALS', message: 'Student ID or password is incorrect' };
  }

  return { studentId };
}

export { authRegister, authLogin };