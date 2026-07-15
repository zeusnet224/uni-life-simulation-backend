import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // For server tests, we don't want test files running in parallel.
    // https://vitest.dev/config/#fileparallelism
    fileParallelism: false,
  },
});
