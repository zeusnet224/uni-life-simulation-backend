// YOU MAY MODIFY THIS FILE
// Design your own data structure to store users, simulations, and any other data you need.

import fs from 'fs';
import path from 'path';
import { AppData, UniverseData, ErrorResponse } from './types.js';

const dataFile = path.join(process.cwd(), 'data.json');

function createInitialData(): AppData {
  return {
    users: [],
    simulations: [],
    sessions: [],
    socialConnections: [],
  };
}

const data: AppData = createInitialData();

// Use getData() to access the data
function getData(): AppData {
  return data;
}

// save persistent data
function saveData(): void {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

// load the existing data that was saved
function loadExistingData(): void {
  if (!fs.existsSync(dataFile)) {
    saveData();
    return;
  }

  try {
    const fileContent = fs.readFileSync(dataFile, 'utf8');
    const loadedData = JSON.parse(fileContent) as AppData;
    for (const key of Object.keys(data) as (keyof AppData)[]) {
      delete data[key];
    }
    Object.assign(data, loadedData);
  } catch (error) {
    console.error('Failed to load data.json:', error);
    const initialData = createInitialData();

    for (const key of Object.keys(data) as (keyof AppData)[]) {
      delete data[key];
    }

    Object.assign(data, initialData);

    saveData();
  }
}


function clearData(): void {
  const initialData = createInitialData();

  for (const key of Object.keys(data) as (keyof AppData)[]) {
    delete data[key];
  }

  Object.assign(data, initialData);

  saveData();
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

export { getData, saveData, loadExistingData, loadData, clearData };
