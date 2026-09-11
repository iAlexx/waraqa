import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts', './tests/int/setup-disposable-db.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    // Payload boot + fixture cleanup routinely exceeds Vitest's 10s default under serial load.
    hookTimeout: 120_000,
  },
})
