import { defineConfig } from 'vitest/config';

// Opt-in, offline experiments. Never collected by the application coverage run.
export default defineConfig({
  test: {
    maxWorkers: 1,
    environment: 'jsdom',
    include: ['benchmarks/vad/**/*.test.ts'],
    coverage: { enabled: false },
    testTimeout: 60_000,
  },
});
