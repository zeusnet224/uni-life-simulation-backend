import { clearData } from './dataStore.js';

// Reset the state of the application back to the start
function clear() : Record<string, never> {
  clearData();
  return {};
}

export { clear };