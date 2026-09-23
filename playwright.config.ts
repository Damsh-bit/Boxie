import { defineConfig, devices } from '@playwright/test'

/**
 * E2E. En CI corre contra Supabase local (migraciones + catálogo inicial) y
 * el build de producción. Localmente se puede correr en modo demo, sin base:
 *
 *   DEMO_MODE=1 npm run build && DEMO_MODE=1 PW_CHANNEL=msedge npm run test:e2e
 *
 * PW_CHANNEL usa un navegador ya instalado (msedge, chrome) en vez de bajar
 * uno.
 */

const PORT = Number(process.env.E2E_PORT ?? 3000)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL,
    trace: 'retain-on-failure',
    locale: 'es-AR',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
