import { defineConfig } from '@playwright/test'

// The app under test must already be running (npm run serve, or a built image).
// SMOKE_BASE_URL is the page that serves index.html; routes are appended as #/path.
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  outputDir: 'results',
  // SMOKE_BASELINE_DIR keeps several baselines side by side (e.g. Vue 2 vs Vue 3)
  snapshotPathTemplate: `${process.env.SMOKE_BASELINE_DIR || 'baseline'}/{arg}{ext}`,
  expect: {
    toHaveScreenshot: {
      // live data changes between runs; this catches layout breakage, not pixel drift
      maxDiffPixelRatio: 0.03,
      animations: 'disabled'
    }
  },
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://localhost:8080/stats/',
    viewport: { width: 1440, height: 900 },
    locale: 'ca-ES',
    timezoneId: 'Europe/Madrid'
  }
})
