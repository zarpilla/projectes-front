// 19. Despeses: factures rebudes — the expenses list, a received invoice assigned to a
// project's expense line, and the new invoice, expense and diet forms.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// nothing is saved, and «Omple dades a partir de PDF» is not used (it sends the PDF to the
// invoice reader). Received invoice 2543 (2026-177) belongs to project 642.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const INVOICE = 2543

const toTop = (locator, offset = 20) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)
const cardTitle = (page, text) => page.locator('.card-header-title', { hasText: text }).first()

test('19-factures-rebudes', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '19-factures-rebudes', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/factures-rebudes')
  await page.getByRole('button', { name: 'Nova factura' }).waitFor()
  await settle(page, 1500)
  await shot(page, 'llistat')

  await page.goto(`#/document/${INVOICE}/received-invoices`)
  await cardTitle(page, 'Document').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'factura')
  const detail = cardTitle(page, 'DETALL DEL PROJECTE')
  if (await detail.count()) {
    await toTop(detail)
    await settle(page, 800)
    // the expense lines are below the income lines of each phase: show the one this invoice pays
    const assigned = page.locator('.invoice-tag', { hasText: 'F 2026-177' }).first()
    if (await assigned.count()) {
      await page.evaluate(() => document.querySelectorAll('.table-wrapper').forEach(w => { w.scrollLeft = w.scrollWidth }))
      await assigned.evaluate(el => el.scrollIntoView({ block: 'center' }))
    }
    await settle(page, 600)
    await shot(page, 'factura-projecte')
  }

  for (const [button, name] of [['Nova factura', 'nova-factura'], ['Nova dieta', 'nova-dieta']]) {
    await page.goto('#/factures-rebudes')
    await settle(page, 800)
    const leave = page.locator('.modal.is-active').getByRole('button', { name: 'OK' })
    if (await leave.count()) await leave.click()
    await page.getByRole('button', { name: button }).click()
    await settle(page, 1500)
    await shot(page, name)
  }
})
