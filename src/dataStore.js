// YOU MAY MODIFY THIS FILE
// Design your own data structure to store users, simulations, and any other data you need.

import fs from 'fs';

// Use getData() to access the data
function getData() {
  return data;
}


let data = {
  users: [],
  simulations: [],
}

/**
 * Load universe data from a JSON file path and return it as a JavaScript object.
 * This function is useful for testing
 *
 * @param {string} universePath - The path to the universe.json file
 * @returns {object} The parsed universe data object, or an error object if loading fails
 *
 * Example usage:
 *   const universeData = loadData('universes/simple.json');
 *   // universeData is now a JS object that can be passed to simulationCreate
 *
 *   // Or create your own universe data for testing:
 *   const customUniverse = {
 *     courses: [
 *       {
 *         courseId: 'COMP1531',
 *         name: 'Software Engineering Fundamentals',
 *         creditPoints: 6,
 *         requiredStudyHours: 100,
 *         difficulty: 'medium',
 *         prerequisites: [],
 *         exams: [
 *           { examId: 'E1-COMP1531', name: 'Midterm', requiredStudyHours: 30 },
 *           { examId: 'E2-COMP1531', name: 'Final Part A', requiredStudyHours: 35 },
 *           { examId: 'E3-COMP1531', name: 'Final Part B', requiredStudyHours: 35 }
 *         ]
 *       }
 *     ],
 *     clubs: []
 *   };
 *   // Pass customUniverse directly to simulationCreate for testing
 */
function loadData(universePath) {
  try {
    const fileContent = fs.readFileSync(universePath, 'utf8');
    const universeData = JSON.parse(fileContent);
    return universeData;
  } catch (error) {
    return {
      error: 'INVALID_UNIVERSE',
      message: `Failed to load universe data from ${universePath}: ${error.message}`
    };
  }
}

// YOU SHOULD NOT NEED TO MODIFY THE FUNCTIONS BELOW

/*
Example usage
  let store = getData()
  console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Rando'] }

  store.names.pop() // Removes the last name from the names array
  store.names.push('Jake') // Adds 'Jake' to the end of the names array

  console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Jake'] }
*/

const data = {};

export { getData, loadData };
