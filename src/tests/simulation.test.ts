// Tests for simulationCreate, simulationStatus and simulationsList in simulation.js
// Covers: error validation, DROPPED_OUT conditions from energy/happiness/course/exam failures
import { describe, expect, test, beforeEach } from 'vitest';
import request from 'sync-request-curl';
import config from './config.json' with { type: 'json' };

const { port, url } = config;

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

const customUniverse = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
      courseStatus: 'FAILED',
    }
  ]
};

const customUniverse2 = {
  courses: [
    {
      courseId: 'COMP1531',
      name: 'Software Engineering Fundamentals',
    }
  ],
  exams: [
    { examId: '1', examOutcome: 'FAIL' },
    { examId: '2', examOutcome: 'FAIL' },
    { examId: '3', examOutcome: 'FAIL' },
    { examId: '4', examOutcome: 'FAIL' },
    { examId: '5', examOutcome: 'FAIL' }
  ]
};

beforeEach(() => {
  request('DELETE', SERVER_URL + '/clear', { timeout: TIMEOUT_MS });
});

// Tests that simulationStatus returns the correct error when given invalid inputs.
// Errors: INVALID_STUDENT_ID, INVALID_SIMULATION
describe('simulationStatus return errors', () => {
  test('return invalid student id', () => {
    const res = request('GET', SERVER_URL + '/simulation/1', { qs: { studentId: 'z7654321' }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_STUDENT_ID', message: expect.any(String) });
  });

  test('return invalid simulation id', () => {
    const register = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(register.body.toString());
    const res = request('GET', SERVER_URL + '/simulation/50000', { qs: { studentId }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });

  test('return invalid simulation when simulation belongs to another student', () => {
    const res1 = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const student1 = JSON.parse(res1.body.toString());
    const res2 = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z7654321', password: 'Pikachu123', nameFirst: 'Ash', nameLast: 'Ketchum' },
        timeout: TIMEOUT_MS });
    const student2 = JSON.parse(res2.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create',
      { json: { studentId: student1.studentId, universe: customUniverse },
        timeout: TIMEOUT_MS });
    const sim = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulation/${sim.simulationId}`, { qs: { studentId: student2.studentId }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'INVALID_SIMULATION', message: expect.any(String) });
  });
});

// Tests that simulationStatus correctly sets simulationStatus to DROPPED_OUT
// when any of these conditions are met:
// - energy reaches 0
// - happiness reaches 0
// - any course has FAILED status
// - 5 or more total exam failures
describe('simulationStatus returns DROPPED_OUT', () => {
  test('Energy reaches 0 points', () => {
    const reg = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(reg.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    for (let i = 0; i < 9; i++) {
      request('POST', SERVER_URL + `/simulation/${simulationId}/action`,
        { json: { studentId, action: 'STUDYING', duration: 3, examId: '1' },
          timeout: TIMEOUT_MS });
      request('POST', SERVER_URL + `/simulation/${simulationId}/action`,
        { json: { studentId, action: 'DOOM_SCROLLING', duration: 1, examId: '1' },
          timeout: TIMEOUT_MS });
    }
    const res = request('GET', SERVER_URL + `/simulation/${simulationId}`, { qs: { studentId }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: 0,
      happiness: body.happiness,
      timeElapsed: body.timeElapsed
    });
  });

  test('Happiness reaches 0 points', () => {
    const reg = request('POST', SERVER_URL + '/auth/register', {
      json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
      timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(reg.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', {
      json: { studentId, universe: customUniverse },
      timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    for (let i = 0; i < 5; i++) {
      request('POST', SERVER_URL + `/simulation/${simulationId}/action`,
        { json: { studentId, action: 'STUDYING', duration: 3, examId: '1' },
          timeout: TIMEOUT_MS });
      request('POST', SERVER_URL + `/simulation/${simulationId}/action`,
        { json: { studentId, action: 'SLEEPING', duration: 3, examId: '1' },
          timeout: TIMEOUT_MS });
    }
    const res = request('GET', SERVER_URL + `/simulation/${simulationId}`, { qs: { studentId }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: body.energy, happiness: 0,
      timeElapsed: body.timeElapsed
    });
  });

  test('Course receives FAILED status', () => {
    const reg = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(reg.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', { json: { studentId, universe: customUniverse }, timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulation/${simulationId}`, { qs: { studentId }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: body.energy,
      happiness: body.happiness, timeElapsed:
      body.timeElapsed });
  });

  test('5 total exams failed', () => {
    const reg = request('POST', SERVER_URL + '/auth/register',
      { json: { studentId: 'z1234567', password: 'ILoveComp1531', nameFirst: 'John', nameLast: 'Smith' },
        timeout: TIMEOUT_MS });
    const { studentId } = JSON.parse(reg.body.toString());
    const simRes = request('POST', SERVER_URL + '/simulation/create', {
      json: { studentId, universe: customUniverse2 },
      timeout: TIMEOUT_MS });
    const { simulationId } = JSON.parse(simRes.body.toString());
    const res = request('GET', SERVER_URL + `/simulation/${simulationId}`, { qs: { studentId }, timeout: TIMEOUT_MS });
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      simulationStatus: 'DROPPED_OUT',
      currentActivity: body.currentActivity,
      energy: body.energy,
      happiness: body.happiness,
      timeElapsed: body.timeElapsed
    });
  });
});
