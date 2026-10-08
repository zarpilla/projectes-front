// Save flows of the critical forms (projects, invoices/expenses, orders).
//
// Nothing is written: reads go to the local backend, every write outside
// /api/auth (POST/PUT/DELETE) is intercepted, recorded and answered with a fake
// success. What a flow sends is compared with what the reference build sent:
//
//   SMOKE_FORMS_RECORD=1 SMOKE_BASE_URL=<reference build> npx playwright test forms.spec.mjs
//   npx playwright test forms.spec.mjs            # compare the build under test
//
// Record and compare on the same day against the same database: payloads hold
// live data. They are kept in baseline-forms/ (git-ignored, tenant data).
// Record ids come from forms.local.json (see forms.example.json).

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  (fs.existsSync(path.join(here, '.env.smoke')) ? fs.readFileSync(path.join(here, '.env.smoke'), 'utf8') : '')
    .split('\n').map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]])
)
const USER = process.env.SMOKE_USER || env.SMOKE_USER
const PASS = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD || env.SMOKE_PASS || env.SMOKE_PASSWORD
const RECORD = process.env.SMOKE_FORMS_RECORD === '1'
const ids = JSON.parse(fs.readFileSync(path.join(here, fs.existsSync(path.join(here, 'forms.local.json')) ? 'forms.local.json' : 'forms.example.json'), 'utf8'))
const baselineDir = path.join(here, 'baseline-forms')

// Same instant for every run, so "today" defaults are reproducible
const NOW = new Date('2026-10-08T10:00:00+02:00')

const FAKE_ID = 990000

async function open (page) {
  const writes = []
  const errors = []
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]))
  await page.clock.setFixedTime(NOW)
  await page.route('**/api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'GET' || url.pathname.startsWith('/api/auth/')) return route.continue()
    let body = req.postData()
    try { body = JSON.parse(body) } catch { /* multipart or empty */ }
    writes.push({ method: req.method(), path: url.pathname + url.search, body })
    const segments = url.pathname.replace(/^\/api\//, '').split('/')
    const id = /^\d+$/.test(segments[1] || '') ? Number(segments[1]) : FAKE_ID + writes.length
    const data = body && typeof body === 'object' && body.data && typeof body.data === 'object' ? body.data : (body && typeof body === 'object' ? body : {})
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...data, id }, meta: {} }) })
  })
  await page.goto('#/')
  await page.locator('input[type=email]').fill(USER)
  await page.locator('input[type=password]').fill(PASS)
  await page.locator('[type=submit]').first().click()
  await page.waitForFunction(() => !!localStorage.getItem('jwt'))
  await page.waitForTimeout(2500)
  return { writes, errors }
}

async function visit (page, route) {
  await page.goto(`#${route}`)
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(3000)
}

async function settle (page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(2500)
}

const visible = (page, selector, options) => page.locator(selector, options).filter({ visible: true }).first()
const field = (page, label) => page.locator('.field').filter({ has: page.locator('.label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) }) }).filter({ visible: true }).first()

async function save (page) {
  await visible(page, 'button', { hasText: /^\s*Guardar\s*$/ }).click()
  await settle(page)
}

async function pickAutocomplete (page, label, text) {
  const input = field(page, label).locator('input').first()
  await input.click()
  await input.pressSequentially(text, { delay: 60 })
  await page.waitForTimeout(1500)
  await visible(page, '.autocomplete .dropdown-item').click()
  await page.waitForTimeout(500)
}

async function selectOption (page, label, index) {
  const select = field(page, label).locator('select').first()
  const value = await select.locator('option').nth(index).getAttribute('value')
  await select.selectOption(value)
  await page.waitForTimeout(400)
}

function check (name, result) {
  const file = path.join(baselineDir, `${name}.json`)
  if (RECORD) {
    fs.mkdirSync(baselineDir, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n')
    return
  }
  expect(fs.existsSync(file), `no recorded payloads for ${name}; record them from the reference build first`).toBe(true)
  const expected = JSON.parse(fs.readFileSync(file, 'utf8'))
  // timestamps the server manages, echoed back from records the form loaded:
  // they change whenever someone edits the data, not because of the form
  const SERVER_STAMPS = new Set(['createdAt', 'updatedAt', 'publishedAt', 'created_at', 'updated_at', 'published_at'])
  const strip = v => Array.isArray(v) ? v.map(strip)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !SERVER_STAMPS.has(k)).map(([k, x]) => [k, strip(x)]))
      : v
  expect(strip(result.writes)).toEqual(strip(expected.writes))
  // axios 1 errors carry name 'AxiosError', which the app's rejection object copies:
  // the same unhandled rejection reads "AxiosError: Object" instead of "Object"
  const errorKey = e => e.replace(/^AxiosError: /, '')
  expect(result.errors.map(errorKey)).toEqual(expected.errors.map(errorKey))
}

const FLOWS = {
  async 'project-edit' (page) {
    await visit(page, `/project/${ids.project}`)
    await save(page)
  },

  async 'project-new' (page) {
    await visit(page, '/project/0')
    await field(page, 'Codi').locator('input').fill('E2E projecte de prova')
    // these selects have no empty option: 0 is the first real value
    await selectOption(page, 'Estat', 0)
    await selectOption(page, 'Àmbit', 0)
    await field(page, 'Descripció').locator('textarea').fill('Descripció de prova')
    await visible(page, 'button', { hasText: /^\s*Continuar\s*$/ }).click()
    await settle(page)
  },

  async 'emitted-invoice-new' (page) {
    await visit(page, '/document/0/emitted-invoices')
    await pickAutocomplete(page, 'Clienta', ids.clientSearch)
    await pickAutocomplete(page, 'Projectes', ids.projectSearch)
    // the first invoice line: concept, quantity, price, discount, VAT, IRPF
    const line = field(page, 'Concepte').locator('input')
    const values = ['Línia de prova', '3', '12.5', '10', '21', '15']
    for (const [i, value] of values.entries()) await line.nth(i).fill(value)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(800)
    // an invoice must be assigned to a project budget line: the first free one
    await page.locator('.project-form').getByText('Document', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await save(page)
    // a new emitted invoice asks for confirmation in a summary modal
    await visible(page, '.modal.is-active .modal-card-foot .button.is-primary').click()
    await settle(page)
  },

  async 'emitted-invoice-edit' (page) {
    await visit(page, `/document/${ids.emittedInvoice}/emitted-invoices`)
    await save(page)
  },

  async 'received-invoice-edit' (page) {
    await visit(page, `/document/${ids.receivedInvoice}/received-invoices`)
    await save(page)
  },

  async 'expense-edit' (page) {
    await visit(page, `/document/${ids.expense}/received-expenses`)
    await save(page)
  },

  async 'order-new' (page) {
    await visit(page, '/order/0')
    await selectOption(page, 'Sòcia', 1)
    await pickAutocomplete(page, "Punt d’entrega", ids.deliveryPointSearch)
    await page.waitForTimeout(1500)
    await field(page, 'Ruta').locator('button').first().click()
    await visible(page, 'button', { hasText: /^\s*Normal\s*$/ }).click()
    await field(page, 'Número de caixes').locator('input').fill('2')
    await field(page, 'Kilograms').locator('input').fill('12.5')
    await field(page, 'Recollida comanda').locator('button', { hasText: ids.orderPickupButton }).click()
    await page.waitForTimeout(800)
    await save(page)
  },

  async 'order-edit' (page) {
    await visit(page, `/order/${ids.order}`)
    await save(page)
  }
}

for (const [name, flow] of Object.entries(FLOWS)) {
  test(name, async ({ page }) => {
    test.skip(!USER || !PASS, 'SMOKE_USER and SMOKE_PASSWORD are required')
    const { writes, errors } = await open(page)
    await flow(page)
    expect(writes.length, `${name} sent no writes: the flow didn't reach a save`).toBeGreaterThan(0)
    check(name, { writes, errors })
  })
}
