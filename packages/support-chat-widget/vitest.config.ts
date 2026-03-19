import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@gravito/ripple-client': fileURLToPath(
        new URL('../ripple-client/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    },
  },
})
