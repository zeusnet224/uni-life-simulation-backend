import { getData } from './dataStore.js';

// Registers a new student with a student ID, password, and names.
// studentId must be lowercase z followed by exactly 7 digits (e.g. z5555555)
// nameFirst and nameLast must be 2-20 characters using only letters, spaces, hyphens or apostrophes
// password must be at least 8 characters and contain at least one letter and one number
// Returns { studentId } on success
// Errors: INVALID_STUDENT_ID, INVALID_FIRST_NAME, INVALID_LAST_NAME, INVALID_PASSWORD
function authRegister(studentId, password, nameFirst, nameLast) {
    const data = getData();
    const valid = /^z\d{7}$/.test(studentId);

    // check 1: incorrect format
    if (!valid) {
        return { error: 'INVALID_STUDENT_ID', message: 'Student ID is not in the correct format'};
    }

    // check 2: studentId must not already be taken by another user
    for (const user of data.users)  {
        if (user.studentId === studentId) {
            return { error: 'INVALID_STUDENT_ID', message: 'Student is already taken'};
        }
    }

    // check 3: nameFirst must be 2-20 characters with only valid characters
    const nameF = /^[a-zA-Z \-']+$/.test(nameFirst);
    if (nameFirst.length < 2 || nameFirst.length > 20 || !nameF) {
        return { error: 'INVALID_FIRST_NAME', message: 'First name is not in the correct format'};

    }

    // check 4: nameLast must be 2-20 characters with only valid characters
    const nameL = /^[a-zA-Z \-']+$/.test(nameLast);
    if (nameLast.length < 2 || nameLast.length > 20 || !nameL) {
        return { error: 'INVALID_LAST_NAME', message: 'Last name is not in the correct format'};

    }

    // check 5: password must be at least 8 chars with at least one letter and one number
    const pass = /[a-zA-Z]/.test(password);
    const passDigit = /[0-9]/.test(password);
    if (password.length < 8 || !pass || !passDigit) {
        return { error: 'INVALID_PASSWORD', message: 'Password is not in the correct format'};
    }

    data.users.push({
        studentId,
        password,
        nameFirst,
        nameLast,
    });

    return { studentId };
}

// Logs in a registered student given their studentId and password.
// Both studentId and password must match a registered user exactly.
// Returns { studentId } on success
// Errors: INVALID_CREDENTIALS if studentId does not exist or password is incorrect
function authLogin(studentId, password) {
    const data = getData();
    const user = data.users.find(u => u.studentId === studentId);
    if (user === undefined) {
        return { error: 'INVALID_CREDENTIALS', message: 'Student ID does not exist' };
    }

    // password must match exactly for the given studentId
    if (user.password !== password) {
        return { error: 'INVALID_CREDENTIALS', message: 'Password is incorrect' };
    }

    return { studentId };
}

export { authRegister, authLogin};

