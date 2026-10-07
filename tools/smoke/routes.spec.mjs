// Visits every route declared in src/router/index.js as a logged-in user and
// records what breaks: uncaught page errors, console errors and Vue warnings.
// With SMOKE_VISUAL=1 each page is also compared against the screenshot
// baseline in ./baseline (create it with `npm run baseline` on the Vue 2 build).
//
//   SMOKE_USER=<email> SMOKE_PASS=<password> [SMOKE_BASE_URL=http://localhost:8080/stats/] npm test
//   (or put those KEY=value lines in tools/smoke/.env.smoke)
//
// Routes with :params are only visited when params.json maps them to concrete
// paths (copy params.example.json). Read-only: it never clicks save/delete.

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// optional, git-ignored KEY=value file so credentials stay out of shell history
const envFile = path.join(here, '.env.smoke')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

const routerSource = fs.readFileSync(path.join(here, '../../src/router/index.js'), 'utf8')

// guest-only screens, or screens that only make sense mid-flow
const SKIP = new Set(['/', '/forgotten-password', '/reset-password'])

const declared = [...new Set(
  [...routerSource.matchAll(/^\s*path:\s*["'`]([^"'`]+)["'`]/gm)].map(m => m[1])
)]

const paramsFile = path.join(here, 'params.json')
const params = fs.existsSync(paramsFile) ? JSON.parse(fs.readFileSync(paramsFile, 'utf8')) : {}

const visits = []
const unresolved = []
for (const route of declared) {
  if (SKIP.has(route)) continue
  if (!route.includes(':')) { visits.push(route); continue }
  const concrete = [].concat(params[route] || [])
  if (concrete.length) visits.push(...concrete)
  else unresolved.push(route)
}

const USER = process.env.SMOKE_USER
const PASS = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD
const VISUAL = process.env.SMOKE_VISUAL === '1'
const STRICT = process.env.SMOKE_STRICT === '1'

// noise that is not caused by the frontend code under test
const IGNORED_CONSOLE = [
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404/,
  /\[HMR\]|\[WDS\]|webpack-dev-server/
]

const slug = p => p.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '_') || 'root'
const firstLine = text => String(text).split('\n')[0]

// Errors the Vue 2 app already throws today are recorded once (npm run baseline)
// so later runs only fail on errors the migration introduced.
const RECORD_KNOWN = process.env.SMOKE_RECORD_KNOWN === '1'
const knownFile = path.join(here, 'baseline', 'known-errors.json')
const readJson = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
const known = readJson(knownFile, {})

// a failing test restarts the worker (and the login), so results are appended per route
const reportFile = path.join(here, 'results', `console-${process.env.SMOKE_LABEL || 'run'}.json`)
function record (route, entry) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true })
  const report = readJson(reportFile, { unresolved, visited: {} })
  report.visited[route] = entry
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
}

test.describe('routes', () => {
  /** @type {import('@playwright/test').Page} */
  let page
  const blockedApiCalls = []

  test.beforeAll(async ({ browser }) => {
    test.skip(!USER || !PASS, 'SMOKE_USER and SMOKE_PASS are required')
    page = await browser.newPage()
    // never let a smoke run reach a real tenant: .env / process.env.VUE_APP_API_URL
    // can point at production, and a few components read it directly
    await page.route(/\/api\//, route => {
      const { hostname } = new URL(route.request().url())
      if (['localhost', '127.0.0.1'].includes(hostname)) return route.continue()
      blockedApiCalls.push(route.request().url())
      return route.abort()
    })
    await page.goto('#/')
    await page.locator('input[type=email]').fill(USER)
    await page.locator('input[type=password]').fill(PASS)
    await page.locator('button[type=submit], [type=submit]').first().click()
    await page.waitForFunction(() => !!localStorage.getItem('jwt'), null, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    await page?.close()
  })

  for (const route of visits) {
    test(route, async () => {
      const pageErrors = []
      const consoleErrors = []
      const vueWarnings = []
      const onPageError = err => pageErrors.push(String(err && err.stack || err))
      const onConsole = msg => {
        const text = msg.text()
        if (text.includes('[Vue warn]')) vueWarnings.push(firstLine(text))
        else if (msg.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(text))) consoleErrors.push(text)
      }
      page.on('pageerror', onPageError)
      page.on('console', onConsole)
      blockedApiCalls.length = 0
      try {
        await page.goto(`#${route}`)
        await page.waitForLoadState('networkidle').catch(() => {})
        // let mounted() hooks finish their follow-up requests and renders
        await page.waitForTimeout(1500)
        // pages keep a b-loading overlay up while their data streams in
        await page.waitForFunction(() => !document.querySelector('.loading-overlay.is-active'), null, { timeout: 30_000 })
          .catch(() => {})
        await page.waitForLoadState('networkidle').catch(() => {})

        // the router guard silently redirects when a permission is missing
        const landed = await page.evaluate(() => location.hash.replace(/^#/, ''))
        record(route, { landed, pageErrors, consoleErrors, vueWarnings, blockedApiCalls: [...blockedApiCalls] })

        if (VISUAL) {
          await expect(page).toHaveScreenshot(`${slug(route)}.png`, { fullPage: true })
        } else {
          await page.screenshot({ path: path.join(here, 'results', 'screens', `${slug(route)}.png`), fullPage: true })
        }

        if (RECORD_KNOWN) {
          const all = readJson(knownFile, {})
          if (pageErrors.length) all[route] = [...new Set(pageErrors.map(firstLine))]
          else delete all[route]
          fs.mkdirSync(path.dirname(knownFile), { recursive: true })
          fs.writeFileSync(knownFile, JSON.stringify(all, null, 2) + '\n')
          return
        }

        const newErrors = pageErrors.filter(e => !(known[route] || []).includes(firstLine(e)))
        expect(newErrors, 'uncaught errors not present in the Vue 2 baseline').toEqual([])
        expect(blockedApiCalls, 'API calls to a non-local host').toEqual([])
        if (STRICT) {
          expect(vueWarnings, 'Vue warnings').toEqual([])
          expect(consoleErrors, 'console errors').toEqual([])
        }
      } finally {
        page.off('pageerror', onPageError)
        page.off('console', onConsole)
      }
    })
  }
})
