// Compares computed styles of common Bulma/Buefy elements between two running
// builds of the app (default: Vue 2 baseline on :8081, branch on :8080), to
// track down visual drift after a CSS framework upgrade.
//
//   node style-diff.mjs /projectes /order/0 ...
//   STYLE_A=http://localhost:8081/stats/ STYLE_B=http://localhost:8080/stats/ node style-diff.mjs /projectes
//
// Uses the same .env.smoke credentials as the route smoke test.

import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '.env.smoke')
const env = fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n').map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]))
  : {}
const USER = process.env.SMOKE_USER || env.SMOKE_USER
const PASS = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD || env.SMOKE_PASS || env.SMOKE_PASSWORD
const A = process.env.STYLE_A || 'http://localhost:8081/stats/'
const B = process.env.STYLE_B || 'http://localhost:8080/stats/'
const routes = process.argv.slice(2)

const SELECTORS = [
  'body', 'a', '.title', '.subtitle', 'label.label', '.help',
  '.button', '.button.is-primary', '.button.is-info', '.button.is-link', '.button.is-warning',
  '.button.is-success', '.button.is-danger', '.button.is-light', '.button.is-small',
  '.input', '.textarea', '.select select', '.b-checkbox.checkbox', '.switch', '.tag', '.field',
  '.card', '.card-header', '.card-header-title', '.card-content',
  '.table', '.table th', '.table td', '.b-table .table-wrapper',
  '.aside', '.aside .menu-label', '.aside .menu-list a', '.aside .menu-list a.is-active',
  '.navbar', '.navbar-item', '.title-bar', '.hero-bar', '.level', '.notification', '.message',
  '.message-header', '.message-body', '.notification.is-warning', '.select.is-empty select',
  '.modal-card-head', '.modal-card-body', '.dropdown-content', '.pagination-link', '.tabs a'
]
const PROPS = [
  'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderBottomColor', 'borderBottomWidth',
  'borderRadius', 'boxShadow', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
  'paddingTop', 'paddingLeft', 'height', 'marginBottom'
]

async function sample (base, route) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(base + '#/')
  await page.locator('input[type=email]').fill(USER)
  await page.locator('input[type=password]').fill(PASS)
  await page.locator('[type=submit]').first().click()
  await page.waitForFunction(() => !!localStorage.getItem('jwt'))
  await page.waitForTimeout(2500)
  await page.goto(base + '#' + route)
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(4000)
  const out = await page.evaluate(({ SELECTORS, PROPS }) => {
    const res = {}
    for (const sel of SELECTORS) {
      const el = [...document.querySelectorAll(sel)].find(e => e.offsetParent !== null || sel === 'body')
      if (!el) continue
      const cs = getComputedStyle(el)
      res[sel] = Object.fromEntries(PROPS.map(p => [p, cs[p]]))
    }
    return res
  }, { SELECTORS, PROPS })
  await browser.close()
  return out
}

for (const route of routes) {
  const [a, b] = await Promise.all([sample(A, route), sample(B, route)])
  console.log(`\n=== ${route}`)
  for (const sel of SELECTORS) {
    if (!a[sel] && !b[sel]) continue
    if (!a[sel] || !b[sel]) { console.log(`  ${sel}: only in ${a[sel] ? 'A' : 'B'}`); continue }
    const diffs = PROPS.filter(p => a[sel][p] !== b[sel][p]).map(p => `${p}: ${a[sel][p]} -> ${b[sel][p]}`)
    if (diffs.length) console.log(`  ${sel}\n    ${diffs.join('\n    ')}`)
  }
}
