// 17. Ingressos: factures emeses — the incomes list, an issued invoice (locked data, lines,
// the project lines it pays), its PDF, cancelling and rectifying, a new draft invoice
// assigned to a project's income line, and other incomes.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Invoice 835
// (2025-102) is issued and linked to project 642. Read-only: «Anul·la i rectifica…» turns the
// page into an unsaved rectifying draft, and the new invoice is filled and assigned to a line
// of project 642 but never saved (saving would mark the line as invoiced).
import { test } from '@playwright/test'
import { start, login, settle, shot, pdfShot } from '../helpers.mjs'

const INVOICE = 835
const PROJECT = 'Jornades de consum responsable Riudemostra'
const CLIENT = 'Cooperativa Riu Clar'

const modal = page => page.locator('.modal.is-active')
const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur())
const toTop = (locator, offset = 20) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)
const cardTitle = (page, text) => page.locator('.card-header-title', { hasText: text }).first()

test('17-factures-emeses', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '17-factures-emeses', { today: '2026-06-17' })
  await login(page)

  await page.goto('/factures-emeses')
  await page.getByRole('button', { name: 'Nova factura' }).waitFor()
  await settle(page, 1500)
  await shot(page, 'llistat')

  // an issued invoice
  await page.goto(`/document/${INVOICE}/emitted-invoices`)
  await page.getByText('Factura emesa:').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'factura-emesa')
  await toTop(cardTitle(page, 'Línies'))
  await settle(page, 400)
  await shot(page, 'factura-linies')
  const detail = cardTitle(page, 'DETALL DEL PROJECTE')
  if (await detail.count()) {
    await toTop(detail)
    await settle(page, 800)
    await shot(page, 'factura-projecte')
  }

  // cancel and rectify: the page becomes an unsaved rectifying draft
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: /Anul·la i rectifica/ }).click()
  await settle(page, 1000)
  await shot(page, 'rectificar', { keepToasts: true })
  await toTop(cardTitle(page, 'Línies'))
  await settle(page, 400)
  await shot(page, 'rectificar-linies')

  // the PDF the API makes (the copy has no logo upload: the PDF is drawn without one)
  await page.goto(`/document/${INVOICE}/emitted-invoices`)
  await page.getByText('Factura emesa:').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await pdfShot(page, page.locator('button', { hasText: /^\s*PDF\s*$/ }).first(), 'pdf')

  // a new invoice, as a draft
  await page.goto('/factures-emeses')
  await settle(page, 800)
  await page.getByRole('button', { name: 'Nova factura' }).click()
  await page.getByPlaceholder('Escriu el nom de la clienta...').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'nova')
  await page.getByPlaceholder('Escriu el nom de la clienta...').fill('Riu Clar')
  await page.locator('.dropdown-item', { hasText: CLIENT }).first().click()
  await settle(page, 500)
  await page.getByPlaceholder('Escriu el nom del projecte...').fill('Jornades de consum')
  await page.locator('.dropdown-item', { hasText: PROJECT }).first().click()
  await settle(page, 2000)
  await blur(page)
  await shot(page, 'nova-client-projecte')
  // the line it pays: «Fact.» on the line, then its «Document» tag becomes «Assignat»
  // (the inputs' value attribute isn't set by the app: mark the row by its live value)
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('tr input')].find(i => i.value === 'Dinamització')
    input.closest('tr').setAttribute('data-manual', 'line')
  })
  const line = page.locator('tr[data-manual="line"]')
  await line.scrollIntoViewIfNeeded()
  await line.locator('.checkbox').last().click()
  await settle(page, 300)
  await line.locator('.invoice-tag', { hasText: 'Document' }).click()
  await settle(page, 500)
  await page.evaluate(() => document.querySelectorAll('.table-wrapper').forEach(w => { w.scrollLeft = w.scrollWidth }))
  await line.evaluate(el => { el.scrollIntoView({ block: 'center' }) })
  await settle(page, 500)
  await shot(page, 'nova-assignar')

  // other incomes (no invoice)
  await page.goto('/factures-emeses')
  await settle(page, 800)
  const leave = page.locator('.modal.is-active').getByRole('button', { name: 'OK' })
  if (await leave.count()) await leave.click()
  await settle(page, 800)
  await page.getByRole('button', { name: 'Nou ingrés' }).click()
  await settle(page, 1500)
  await shot(page, 'nou-ingres')
})
