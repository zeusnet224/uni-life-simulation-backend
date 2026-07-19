import { getData } from './dataStore.js';
import { findOwnedSimulationOrError, isError } from './validators.js';
import { Result, SocialConnection } from './types.js';
import crypto from 'crypto';

const MAX_NAME_LENGTH = 50;

function isValidCloseness(closeness: number): boolean {
  return Number.isInteger(closeness) && closeness >= 1 && closeness <= 5;
}

// Creates a new social connection for a given simulation.
// Returns { connectionId } on success.
// Errors: INVALID_SIMULATION, INVALID_NAME, INVALID_CLOSENESS, DUPLICATE_CONNECTION
function socialConnectionCreate(
  studentId: string,
  simulationId: number,
  name: string,
  closeness: number ): Result<{ connectionId: string }> {
  const data = getData();

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'INVALID_SIMULATION', message: 'Simulation has already ended' };
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
    return { error: 'INVALID_NAME', message: 'Name must be a non-empty string under 50 characters' };
  }

  if (!isValidCloseness(closeness)) {
    return { error: 'INVALID_CLOSENESS', message: 'Closeness must be an integer between 1 and 5' };
  }

  const duplicate = data.socialConnections.find(
    c => c.simulationId === simulationId && c.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { error: 'DUPLICATE_CONNECTION', message: 'A connection with this name already exists' };
  }

  const connectionId = crypto.randomUUID();
  data.socialConnections.push({
    connectionId,
    simulationId,
    name,
    closeness,
    createdAt: simulation.timeElapsed,
  });

  return { connectionId };
}

// Lists all social connections for a given simulation.
// Returns { connections: SocialConnection[] }
// Errors: INVALID_SIMULATION
function socialConnectionsList(
  studentId: string,
  simulationId: number
): Result<{ connections: SocialConnection[] }> {
  const data = getData();

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  const connections = data.socialConnections.filter(c => c.simulationId === simulationId);
  return { connections };
}

// Removes a social connection by connectionId from a given simulation.
// Returns {} on success.
// Errors: INVALID_SIMULATION, INVALID_CONNECTION
function socialConnectionRemove(
  studentId: string,
  simulationId: number,
  connectionId: string
): Result<Record<string, never>> {
  const data = getData();

  const simulation = findOwnedSimulationOrError(studentId, simulationId);
  if (isError(simulation)) return simulation;

  if (simulation.simulationStatus !== 'ACTIVE') {
    return { error: 'INVALID_SIMULATION', message: 'Simulation has already ended' };
  }

  const index = data.socialConnections.findIndex(
    c => c.simulationId === simulationId && c.connectionId === connectionId
  );
  if (index === -1) {
    return { error: 'INVALID_CONNECTION', message: 'Connection ID does not exist for this simulation' };
  }

  data.socialConnections.splice(index, 1);
  return {};
}

export { socialConnectionCreate, socialConnectionsList, socialConnectionRemove };