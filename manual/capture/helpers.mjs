// Shared helpers for the manual screenshots: pointing the app at the anonymized backend,
// login, waiting for a screen to settle, and saving numbered screenshots for a chapter.
//
//   import { test } from '@playwright/test'
//   import { start, login, settle, shot } from '../helpers.mjs'
//   test('03-llistat-projectes', async ({ page }) => {
//     await start(page, '03-llistat-projectes')
//     await login(page)
//     await settle(page)
//     await shot(page, 'filtres')
//   })

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const manualDir = path.resolve(here, '..')

// git-ignored KEY=value file so credentials stay out of scripts and shell history
export function loadEnv () {
  const file = path.join(here, '.env.manual')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

const state = new WeakMap()

// The only backend a capture may talk to: the anonymized copy (see anonymize.sql).
const apiUrl = () => process.env.MANUAL_API_URL || 'http://127.0.0.1:1338'
const baseUrl = () => process.env.MANUAL_BASE_URL || 'http://localhost:8081/stats/'

// Call first: names the chapter (its screenshot folder) and points the app at MANUAL_API_URL.
// The front reads its API url at runtime from /config.js, which in dev points at the
// everyday backend (a real tenant).
export async function start (page, slug) {
  state.set(page, { slug, shots: 0 })
  await page.route(/\/config\.js(\?|$)/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.APP_CONFIG = ${JSON.stringify({
      VUE_APP_API_URL: apiUrl(),
      VUE_APP_RESET_PASSWORD: baseUrl() + '#/reset-password',
      VUE_APP_PATH: baseUrl()
    })};`
  }))
  // and never let anything reach another backend (a few components read the build-time
  // VUE_APP_API_URL directly, which .env may point at production)
  const allowed = new URL(apiUrl()).origin
  await page.route(/\/(api|uploads)\//, route =>
    new URL(route.request().url()).origin === allowed ? route.continue() : route.abort())
}

export async function login (page, user = process.env.MANUAL_USER, password = process.env.MANUAL_PASSWORD) {
  if (!user || !password) throw new Error('MANUAL_USER and MANUAL_PASSWORD are required (.env.manual)')
  await page.goto('#/')
  await page.locator('input[type=email]').fill(user)
  await page.locator('input[type=password]').fill(password)
  await page.locator('[type=submit]').first().click()
  await page.waitForFunction(() => !!localStorage.getItem('jwt'), null, { timeout: 15_000 })
  // the app then redirects away from the login route; navigating before that gets overridden
  await page.waitForURL(url => !/#\/?$/.test(url.href), { timeout: 20_000 })
  await page.waitForLoadState('networkidle')
  // the "Benvinguda" toast would end up in the first screenshots
  await page.getByText('Benvinguda').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
}

// Waits for the screen's data to load (no requests in flight, no Buefy loading spinner)
// and the UI to settle.
export async function settle (page, ms = 800) {
  await page.waitForLoadState('networkidle')
  await page.locator('.loading-overlay.is-active').first().waitFor({ state: 'hidden', timeout: 60_000 })
  await page.waitForTimeout(ms)
}

// Screenshot for the chapter: manual/ca/img/<slug>/NN-<name>.png (numbered in order).
// Pass { clip } or { fullPage: true } through options when a step needs it.
export async function shot (page, name, options = {}) {
  const s = state.get(page)
  const file = path.join(manualDir, 'ca', 'img', s.slug, `${String(++s.shots).padStart(2, '0')}-${name}.png`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await page.mouse.move(0, 0) // no hover effects in the picture
  await page.screenshot({ path: file, animations: 'disabled', ...options })
  return file
}
