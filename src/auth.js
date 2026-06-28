import { getData } from './dataStore.js';

// register a student with their student ID, password, and names, then return the student ID.
function authRegister(studentId, password, nameFirst, nameLast) {
    const data = getData();
    const valid = /^z\d{7}$/.test(studentId);

    // check 1: incorrect format
    if (!valid) {
        return { error: 'INVALID_STUDENT_ID', message: 'Student ID is not in the correct format'};
    }

    // check 2: existing name
    for (const user of data.users)  {
        if (user.studentId === studentId) {
            return { error: 'INVALID_STUDENT_ID', message: 'Student is already taken'};
        }
    }

    // check 3: inavlid first name
    const nameF = /^[a-zA-Z \-']+$/.test(nameFirst);
    if (nameFirst.length < 2 || nameFirst.length > 20 || !nameF) {
        return { error: 'INVALID_FIRST_NAME', message: 'First name is not in the correct format'};

    }

    // check 4: invalid last name
    const nameL = /^[a-zA-Z \-']+$/.test(nameLast);
    if (nameLast.length < 2 || nameLast.length > 20 || !nameL) {
        return { error: 'INVALID_LAST_NAME', message: 'Last name is not in the correct format'};

    }

    //check 5: invalid password
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

// Given a registered student ID and password, return their student ID
function authLogin(studentId, password) {
    const data = getData();
    const user = data.users.find(u => u.studentId === studentId);
    if (user === undefined) {
        return { error: 'INVALID_CREDENTIALS', message: 'Student ID does not exist' };
    }

    //password doesn't match
    if (user.password !== password) {
        return { error: 'INVALID_CREDENTIALS', message: 'Password is incorrect' };
    }

    return { studentId };
}

export { authRegister, authLogin};

