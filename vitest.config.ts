import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Points MERIDIAN_ENV_PATH at nothing, so no test can read the developer's
    // own .env by falling through to it. See the file for what that cost once.
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
