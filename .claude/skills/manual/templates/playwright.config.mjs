import { defineConfig } from '@playwright/test'
import { loadEnv } from './helpers.mjs'

loadEnv()

// Each spec in scripts/ takes the screenshots of one manual chapter. The app must already be
// running against the anonymized backend (see the manual skill).
export default defineConfig({
  testDir: 'scripts',
  testMatch: /.*\.spec\.mjs/,
  timeout: 5 * 60_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'results',
  use: {
    baseURL: process.env.MANUAL_BASE_URL || 'http://localhost:8081/stats/',
    viewport: { width: 1440, height: 900 },
    locale: 'ca-ES',
    timezoneId: 'Europe/Madrid',
    actionTimeout: 10_000
  }
})
