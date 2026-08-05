import { getData } from './dataStore.js';
import { Student, Simulation, Result } from './types.js';

// Finds a registered student by studentId.
// Returns the student object if found, or an INVALID_STUDENT_ID error object if not.
function findStudentOrError(studentId: string): Result<Student> {
  const data = getData();
  const student = data.users.find(u => u.studentId === studentId);
  if (!student) {
    return { error: 'INVALID_STUDENT_ID', message: 'Student ID does not refer to a registered student' };
  }
  return student;
}

// Finds a simulation by simulationId only — does not check ownership.
// Used by read-only routes (e.g. course/exam inspection) that don't take a studentId.
// Returns the simulation object if found, or an INVALID_SIMULATION error object if not.
function findSimulationOrError(simulationId: number): Result<Simulation> {
  const data = getData();
  const simulation = data.simulations.find(sim => sim.simulationId === simulationId);
  if (!simulation) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation ID does not exist' };
  }
  return simulation;
}

// Finds a simulation by simulationId AND checks it belongs to the given studentId.
// Returns the simulation object if found and owned, or an INVALID_SIMULATION error object if not.
function findOwnedSimulationOrError(studentId: string, simulationId: number): Result<Simulation> {
  const simulation = findSimulationOrError(simulationId);
  if (isError(simulation)) {
    return simulation;
  }
  if (simulation.studentId !== studentId) {
    return { error: 'INVALID_SIMULATION', message: 'Simulation does not belong to the given student' };
  }
  return simulation;
}

// True if the value returned by a findXOrError function is an error.
function isError<T>(value: Result<T>): value is { error: string; message: string } {
  return value !== null && typeof value === 'object' && 'error' in value;
}

export { findStudentOrError, findSimulationOrError, findOwnedSimulationOrError, isError };
