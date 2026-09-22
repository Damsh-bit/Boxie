import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` rompe fuera de Next; en tests es un módulo vacío.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}', 'tests/db/**/*.test.ts'],
    // PGlite arranca un Postgres entero por archivo de test: más tiempo de gracia.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
