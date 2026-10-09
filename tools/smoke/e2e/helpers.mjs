// Shared setup and helpers of the end-to-end tests (see ../README.md, "End-to-end tests").
//
// These tests save for real, so they only run against a throwaway copy of an
// anonymized tenant:
//   - the app is pointed at E2E_API_URL (local only), every other backend is blocked;
//   - before writing, the database must contain the "E2E SENTINEL" contact that
//     e2e-db.sh adds to its copies, so a real tenant can never be written to.
//
// Settings come from ../.env.e2e (E2E_USER, E2E_PASSWORD, E2E_BASE_URL, E2E_API_URL).
// Records are named "E2E <run stamp> ..." so runs don't collide; rebuild the
// database with e2e-db.sh to start clean.
//
// Each spec file calls useE2E() once at the top: it runs its tests in order on one
// logged-in page (later tests use what earlier ones created), exported as `page`.

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '..', '.env.e2e')
export const env = {
  ...Object.fromEntries(
    (fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '')
      .split('\n').map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]])
  ),
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('E2E_')))
}
const BASE_URL = env.E2E_BASE_URL || 'http://localhost:8082/stats/'
export const API_URL = env.E2E_API_URL || 'http://localhost:1339'
const SENTINEL = 'E2E SENTINEL'

export const STAMP = new Date().toISOString().replace(/\D/g, '').slice(2, 14)
export const NAME = `E2E ${STAMP}`

// Bugs these flows are known to hit, that are not about the flows themselves.
// They are reported as annotations instead of failing the run; remove an entry
// once its bug is fixed so it can't come back unnoticed.
const KNOWN_ERRORS = [
  {
    match: /reading 'getService'.*ProjectGannt\.vue/,
    why: 'ProjectGannt: the mounted() timers still run after the chart is destroyed (leaving the planning quickly)'
  },
  {
    match: /of null \(reading 'id'\).*ProjectForm\.vue/,
    why: 'ProjectForm.submit() sets form.region = null before the request; the template still reads form.region.id'
  }
]

// --- session -------------------------------------------------------------------

export let page
let jwt
const errors = []
// what a spec's tests share: the logged-in user (`me`) and whatever they create
export const state = {}

// A page pointed at the e2e backend, with every other backend blocked, not logged in.
export async function openAnonymous (browser) {
  const host = new URL(API_URL).hostname
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error(`E2E_API_URL must be local, got ${API_URL}`)
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 }, locale: 'ca-ES', timezoneId: 'Europe/Madrid' })
  // routes on the context, so tabs the app opens (window.open) follow them too.
  // The front reads its API url at runtime from /config.js; point it at the e2e backend
  await context.route(/\/config\.js(\?|$)/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.APP_CONFIG = ${JSON.stringify({ VUE_APP_API_URL: API_URL, VUE_APP_PATH: BASE_URL, VUE_APP_RESET_PASSWORD: BASE_URL + '#/reset-password' })};`
  }))
  // and never let a request reach another backend (some components read the build-time url)
  const allowed = new URL(API_URL).origin
  await context.route(/\/(api|uploads)\//, route =>
    new URL(route.request().url()).origin === allowed ? route.continue() : route.abort())
  return context.newPage()
}

// Same, logged in as `user`
export async function openSession (browser, user = env.E2E_USER, password = env.E2E_PASSWORD) {
  const p = await openAnonymous(browser)
  await login(p, user, password)
  return p
}

export async function login (p, user, password) {
  await p.goto('#/')
  await p.locator('input[type=email]').fill(user)
  await p.locator('input[type=password]').fill(password)
  await p.locator('[type=submit]').first().click()
  await p.waitForFunction(() => !!localStorage.getItem('jwt'))
  await p.waitForURL(url => !/#\/?$/.test(url.href))
}

const cleanups = []
// runs `fn` after the spec's last test, while the session is still open
export function onCleanup (fn) {
  cleanups.push(fn)
}

// Registers the hooks of a spec file: one session for all its tests, the sentinel
// check, and a failure screenshot plus the uncaught-errors check after each test.
export function useE2E () {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    test.skip(!env.E2E_USER || !env.E2E_PASSWORD, 'E2E_USER and E2E_PASSWORD are required (.env.e2e)')
    page = await openSession(browser)
    page.on('pageerror', e => errors.push((e.stack || String(e)).split('\n').slice(0, 12).join(' ').replace(/https?:\/\/[^/]+/g, '')))
    jwt = await page.evaluate(() => localStorage.getItem('jwt'))

    const sentinel = await api('GET', `contacts?_where[name]=${encodeURIComponent(SENTINEL)}&_limit=1`)
    if (!sentinel.length) throw new Error(`${API_URL} has no "${SENTINEL}" contact: not an e2e database (see e2e-db.sh). Refusing to write.`)
    state.me = await api('GET', 'users/me')
  })

  test.afterAll(async () => {
    for (const fn of cleanups.splice(0)) {
      await fn().catch(e => console.warn(`cleanup failed: ${e.message}`))
    }
    await page?.context().close()
  })

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus && page) {
      await page.screenshot({ path: testInfo.outputPath('screen.png'), fullPage: true })
      await testInfo.attach('screen', { path: testInfo.outputPath('screen.png'), contentType: 'image/png' })
    }
    const thrown = errors.splice(0)
    for (const error of thrown) {
      const known = KNOWN_ERRORS.find(k => k.match.test(error))
      if (known) {
        testInfo.annotations.push({ type: 'known error', description: known.why })
        console.warn(`[${testInfo.title}] known error: ${known.why}`)
      }
    }
    expect(thrown.filter(e => !KNOWN_ERRORS.some(k => k.match.test(e))), 'uncaught errors in the page').toEqual([])
  })
}

// --- API -----------------------------------------------------------------------

// Calls the backend as the logged-in user (v3-style queries are accepted).
// Returns the unwrapped `data` of a { data, meta } envelope.
export async function api (method, route, body, { raw = false, token } = {}) {
  // access tokens are short-lived and the app refreshes them: use the current one
  if (!token) jwt = (await page.evaluate(() => localStorage.getItem('jwt'))) || jwt
  const res = await fetch(`${API_URL}/api/${route}`, {
    method,
    headers: { Authorization: `Bearer ${token || jwt}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json().catch(() => null)
  if (raw) return { status: res.status, body: json }
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${JSON.stringify(json)}`)
  return json && json.data !== undefined && !Array.isArray(json) && Object.keys(json).every(k => k === 'data' || k === 'meta') ? json.data : json
}

// --- screen ----------------------------------------------------------------------

export async function settle (ms = 500) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.locator('.loading-overlay.is-active').first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(ms)
}

export async function visit (route) {
  // a different route first: the same view doesn't remount when only its params change
  await page.goto('#/changelog')
  await page.goto(`#${route}`)
  await settle(1500)
}

export const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const visible = (selector, options) => page.locator(selector, options).filter({ visible: true }).first()
// the Buefy field whose own label reads `label` (a regexp source; a trailing " *" is
// ignored). Grouped fields nest: only the label of the field itself counts.
export const field = (label, scope = page) => scope.locator('.field').filter({
  has: page.locator(':scope > .label, :scope > .field-label > .label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) })
}).filter({ visible: true }).first()
export const button = (text, scope = page) => scope.locator('button, a.button').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`) }).filter({ visible: true }).first()
export const card = title => page.locator('.card').filter({ has: page.locator('.card-header-title', { hasText: title }) }).first()
export const modal = title => page.locator('.modal.is-active').filter({ hasText: title }).last()

// accepts the Buefy confirm dialog that reads `text`
export async function confirmDialog (text) {
  const dialog = page.locator('.dialog.modal.is-active', { hasText: text }).last()
  await expect(dialog).toBeVisible()
  await dialog.locator('.modal-card-foot .button.is-primary, .modal-card-foot .button.is-danger').last().click()
  await expect(dialog).toBeHidden()
}

// Buefy snackbars: wait for the given text, then dismiss it so it can't cover anything
export async function expectSnackbar (text) {
  const snackbar = page.locator('.snackbar', { hasText: text }).first()
  await expect(snackbar).toBeVisible({ timeout: 20_000 })
  await snackbar.locator('.action button, .action').first().click().catch(() => {})
}

export async function selectByLabel (label, optionText, scope = page) {
  await field(label, scope).locator('select').first().selectOption({ label: optionText })
}

// types `text` and picks the dropdown item that reads exactly `option`
export async function pickAutocomplete (label, text, option = text, scope = page) {
  const input = field(label, scope).locator('input').first()
  await input.click()
  await input.fill('')
  await input.pressSequentially(text, { delay: 30 })
  await scope.locator('.autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(option)}\\s*$`) }).filter({ visible: true }).first().click()
  await page.waitForTimeout(500)
}

// an editable Buefy datepicker: Tab parses the text and closes the calendar
// (Escape would close an enclosing modal)
export async function typeDate (input, text) {
  await input.click()
  await input.fill(text)
  await input.press('Tab')
}

// "1.234,50 €" / "4.75 h" → number
export const parseNumber = text => {
  const t = String(text).replace(/[^\d,.-]/g, '')
  return Number(/,\d+$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t)
}

export const today = () => new Date().toLocaleDateString('ca-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'numeric', year: 'numeric' })
export const isoToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })

// --- projects ----------------------------------------------------------------------

// the phase whose name input holds `name`
export async function phaseNamed (scope, name) {
  const phases = scope.locator('.phase-container')
  for (let i = 0; i < await phases.count(); i++) {
    if (await phases.nth(i).locator('.phase-detail-input input').inputValue() === name) return phases.nth(i)
  }
  throw new Error(`no phase named "${name}"`)
}

export async function addPhase (scope, name) {
  const input = field('Nova Fase', scope).locator('input')
  await input.fill(name)
  await input.press('Enter')
  return phaseNamed(scope, name)
}

// fills the last income (or expense) line of a phase, adding the first one if there is none
export async function addLine (phase, kind, { concept, quantity, price }) {
  const placeholder = kind === 'income' ? 'Nom de la subfase...' : 'Nom de la despesa...'
  const lines = phase.locator(`input[placeholder="${placeholder}"]`)
  if (await lines.count() === 0) {
    // the empty incomes table comes first, then the expenses one
    await phase.locator('.add-subphase button').nth(kind === 'income' ? 0 : -1).click()
  }
  const row = lines.last().locator('xpath=ancestor::tr[1]')
  await lines.last().fill(concept)
  await row.locator('input[name="Unitats"]').fill(String(quantity))
  await row.locator('input[name="PreuUnitari"]').fill(String(price))
  await row.locator('input[name="PreuUnitari"]').press('Tab')
}

// Creates a project through the wizard, with one phase and the given lines, and
// closes its budget. Returns its id. The steps are checked in core.spec.mjs; other
// specs use this to get a project of their own.
export async function createProject (name, { incomes = [], expenses = [] } = {}) {
  await visit('/project/0')
  await field('Codi').locator('input').fill(name)
  await selectByLabel('Estat', 'Actiu')
  await field('Àmbit').locator('select').selectOption({ index: 0 })
  await button('Continuar').click()
  await expect(page).toHaveURL(/#\/project\/[1-9]\d*/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  const id = Number(page.url().match(/#\/project\/(\d+)/)[1])
  await settle()
  const original = card('FASES I PRESSUPOST ORIGINAL')
  const phase = await addPhase(original, `${name} fase`)
  for (const line of incomes) await addLine(phase, 'income', line)
  for (const line of expenses) await addLine(phase, 'expense', line)
  await button('Continuar', original).click()
  await expectSnackbar('Guardat')
  await settle()
  await expect(page.locator('.gantt_container').first()).toBeVisible({ timeout: 20_000 })
  await visible('button', { hasText: /^\s*Continuar\s*$/ }).click()
  await settle()
  await button('Tancar pressupost').click()
  await settle(1500)
  return id
}

// a value of the project's "RESUM FINANCER PROJECTE" card, as a number
export async function summaryValue (label) {
  const box = field(escapeRegExp(label), card('RESUM FINANCER PROJECTE'))
  // hours are in a .has-text-right div, money in a money-format; the diff tooltip
  // around them may add more numbers, so take the first one after the label
  const value = box.locator('.has-text-right')
  const text = await value.count()
    ? await value.first().innerText()
    : (await box.innerText()).replace(await box.locator('.label').first().innerText(), '')
  return parseNumber(text.match(/-?\d[\d.,]*/)?.[0] ?? '')
}

export const executedHours = () => summaryValue('Hores executades (h)')

// Shows the month of `isoDate` in the #/dedicacio calendar (the filters follow it)
export async function calendarMonth (isoDate) {
  const now = new Date()
  const [y, m] = isoDate.split('-').map(Number)
  const steps = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth())
  for (let i = 0; i < Math.abs(steps); i++) {
    await page.locator(steps > 0 ? '.vc-arrow.vc-next' : '.vc-arrow.vc-prev').first().click()
    await settle(300)
  }
  await expect(page.locator(`.vc-day.id-${isoDate}`).first()).toBeVisible()
}

// Adds an activity in #/dedicacio: on the calendar day `day` (ISO, its month must be
// shown, see calendarMonth), or for today with "Afegir dedicació"
export async function addActivity ({ project, hours, description, day }) {
  if (day) await page.locator(`.vc-day.id-${day} .day-label`).first().click()
  else await visible('button[title="Afegir dedicació"], a[title="Afegir dedicació"]').click()
  const box = modal('Entrada hores')
  await expect(box).toBeVisible()
  await field('Hores', box).locator('input').fill(String(hours))
  const input = field('Projecte', box).locator('input')
  await input.click()
  await input.pressSequentially(project, { delay: 20 })
  await box.locator('.autocomplete .dropdown-item', { hasText: project }).first().click()
  await field('Descripció', box).locator('input').fill(description)
  await button("D'acord", box).click()
  await expectSnackbar('Guardat')
  await expect(box).toBeHidden()
  await settle()
}

// --- Persones (work periods) --------------------------------------------------------

// the user's work periods ("Jornades") that start on `from` (ISO)
export async function periodsFrom (userId, from) {
  const periods = await api('GET', `daily-dedications?_where[users_permissions_user]=${userId}&_limit=-1`)
  return periods.filter(p => p.from === from)
}

// Opens the "Jornada" modal of a new period for `username` in #/working-day
export async function openNewPeriod (username) {
  await visit('/working-day')
  await page.locator('.gantt_grid_data .gantt_row', { hasText: username }).first().click()
  const box = modal('Jornada')
  await expect(box).toBeVisible()
  return box
}

// Fills the "Jornada" modal. Dates are d/m/yyyy.
export async function fillPeriod (box, { fromText, toText, hours, salary, general = true, pctQuota }) {
  // the modal clears its "changed" flag 100 ms after opening: an edit before that is
  // dropped and D'acord just closes it (ModalBoxWorkingDay.show)
  await page.waitForTimeout(300)
  const dates = field('Període', box).locator('input')
  if (fromText) await typeDate(dates.nth(0), fromText)
  if (toText) await typeDate(dates.nth(1), toText)
  if (hours !== undefined) await field('Hores', box).locator('input').fill(String(hours))
  if (salary !== undefined) await field('Salari base \\(€\\)', box).locator('input').fill(String(salary))
  if (general) await box.getByText('Règim General').click()
  if (pctQuota !== undefined) await box.locator('input[placeholder="Quota %"]').fill(String(pctQuota))
  await page.waitForTimeout(300)
}

// "Cost/hora (€)" as the modal computes it
export async function modalCostByHour (box) {
  return parseNumber(await field('Cost/hora \\(€\\)', box).locator('.readonly-fake').innerText())
}

// --- documents ---------------------------------------------------------------------

// A contact of a spec's own for documents (they need a NIF, and the anonymized
// copies have many contacts with the same name)
export async function contactWithNif (suffix = 'contacte') {
  const key = `contact:${suffix}`
  if (!state[key]) {
    state[key] = await api('POST', 'contacts', { data: { name: `${NAME} ${suffix}`, nif: `E2E${STAMP}${suffix.length}` } })
  }
  return state[key]
}

// the row of the project budget line (in the document's project detail) whose concept is `concept`
export async function budgetLine (concept) {
  const inputs = page.locator('.project-form input[name="SubFase"]')
  await expect(inputs.first()).toBeVisible({ timeout: 20_000 })
  for (let i = 0; i < await inputs.count(); i++) {
    if (await inputs.nth(i).inputValue() === concept) return inputs.nth(i).locator('xpath=ancestor::tr[1]')
  }
  throw new Error(`no budget line "${concept}" in the project detail`)
}

// marks the budget line as invoiced ("Fact.") and assigns it to this document ("Document" → "Assignat")
export async function assignBudgetLine (concept) {
  const row = await budgetLine(concept)
  await row.locator('.checkbox, .b-checkbox').last().click()
  await row.locator('.invoice-tag', { hasText: 'Document' }).click()
  await expect(row.locator('.invoice-tag', { hasText: 'Assignat' })).toBeVisible()
}

// the first document line: concept, quantity, price, discount %, VAT %, IRPF %
export async function fillLine ({ concept, quantity, price, discount = 0, vat, irpf = 0 }) {
  const lines = card('LINIES')
  const values = { SubFase: concept, Unitats: quantity, base: price, discount, vat, irpf }
  for (const [name, value] of Object.entries(values)) await lines.locator(`input[name="${name}"]`).first().fill(String(value))
  await lines.locator('input[name="irpf"]').first().press('Tab')
  await page.waitForTimeout(800) // the line totals are debounced
}

// A new emitted invoice (a draft) for `projectName`, assigned to its budget line
// `budgetConcept`. Returns its id.
export async function createEmittedInvoice ({ contact, projectName, budgetConcept, line }) {
  await visit('/document/0/emitted-invoices')
  await pickAutocomplete('Clienta', contact.name)
  await pickAutocomplete('Projectes', projectName)
  await fillLine(line)
  await assignBudgetLine(budgetConcept)
  await button('Guardar').click()
  await button("D'acord", modal('Esborranys de factures')).click()
  await expect(page).toHaveURL(/#\/document\/[1-9]\d*\/emitted-invoices/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  await settle()
  return Number(page.url().match(/#\/document\/(\d+)\//)[1])
}

// A new received invoice for `projectName`, dated `date` (d/m/yyyy, default today),
// assigned to its budget line `budgetConcept`. Returns its id.
export async function createReceivedInvoice ({ contact, projectName, budgetConcept, line, number, date = today() }) {
  await visit('/document/0/received-invoices')
  // received invoices have no default date
  await typeDate(field('Emissió').locator('input'), date)
  await pickAutocomplete('Proveïdora', contact.name)
  if (number) await field('Número factura proveïdora').locator('input').fill(number)
  await pickAutocomplete('Projectes', projectName)
  await fillLine(line)
  await assignBudgetLine(budgetConcept)
  await button('Guardar').click()
  await expect(page).toHaveURL(/#\/document\/[1-9]\d*\/received-invoices/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  await settle()
  return Number(page.url().match(/#\/document\/(\d+)\//)[1])
}

// The treasury forecast rows of a document (#/tresoreria reads the same endpoint)
export async function treasuryRows (to, years = [new Date().getFullYear()]) {
  const states = (await api('GET', 'project-states?_limit=-1')).map(s => s.id).join(',')
  const rows = []
  for (const year of years) {
    const forecast = await api('GET', `treasuries/forecast?_limit=-1&project_states=${states}&year=${year}&periodification=null`)
    rows.push(...forecast.treasury.filter(r => r.to === to))
  }
  return rows
}
