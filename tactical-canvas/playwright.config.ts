import { defineConfig, devices } from '@playwright/test'

/**
 * Tests en navegador sobre el build de producción (npm run build antes). En CI se instala el mismo
 * Chromium que fija @playwright/test, así la regresión visual compara píxeles reales sin ruido.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: 'block',
    acceptDownloads: true,
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
