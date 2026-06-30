import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // For server tests, we don't want tests running parallel.
    // https://vitest.dev/config/sequence.html
    sequence: { concurrent: false },
  },
});
