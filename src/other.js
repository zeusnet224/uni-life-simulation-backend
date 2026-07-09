  import { clearData, getData } from './dataStore.js';

  // Reset the state of the application back to the start
  function clear() {
    clearData();
    return {};
  }

  export { clear };