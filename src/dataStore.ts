// YOU MAY MODIFY THIS FILE
// Design your own data structure to store users, simulations, and any other data you need.

import fs from 'fs';
import { AppData, UniverseData, ErrorResponse } from './types.js';

function createInitialData(): AppData {
  return {
    users: [],
    simulations: [],
  };
}

let data: AppData = createInitialData();

// Use getData() to access the data
function getData(): AppData {
  return data;
}

function clearData(): void {
  const initialData = createInitialData();

  for (const key of Object.keys(data) as (keyof AppData)[]) {
    delete data[key];
  }

  Object.assign(data, initialData);
}

/**
 * Load universe data from a JSON file path and return it as a JavaScript object.
 * This function is useful for testing.
 */
function loadData(universePath: string): UniverseData | ErrorResponse {
  try {
    const fileContent = fs.readFileSync(universePath, 'utf8');
    const universeData = JSON.parse(fileContent) as UniverseData;
    return universeData;
  } catch (error) {
    const err = error as Error;
    return {
      error: 'INVALID_UNIVERSE',
      message: `Failed to load universe data from ${universePath}: ${err.message}`
    };
  }
}

export { getData, loadData, clearData };
