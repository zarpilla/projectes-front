// 33. Facturació de la logística — Sòcies, Facturar, the member's Factures and the orders report
// (KPIs and charts). Data: anonymized logistics copy (projectes_v5_manual_logistica,
// MANUAL_DATA=logistica), seen on 06/10/2026.
// Writes nothing: Facturar is only looked at (a project is picked and rows are ticked, but no
// «Factura» button is pressed), so no invoice is created and no order changes status.
// Example project: 30 «Jornades de sobirania alimentària» (the anonymized name of the quarter's
// logistics project, the one the latest logistics invoices are linked to).
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

const TODAY = '2026-10-06'

// the provider's reminder about pending invoices names the real cooperative: close it, never shoot it
async function closeHello (page) {
  const ok = page.getByRole('button', { name: "D'acord" })
  await ok.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => {})
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

test('33-facturacio-logistica', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '33-facturacio-logistica', { today: TODAY })
  await login(page, ...logUser('admin'))

  // Sòcies
  await page.goto('#/partners')
  await page.getByText('Sense fitxa de contacte').waitFor()
  await settle(page, 800)
  await shot(page, 'socies')

  // Facturar, as it opens
  await page.goto('#/orders-invoice')
  await page.getByText('Per facturar').waitFor()
  await settle(page, 1000)
  await shot(page, 'facturar')

  // a project picked, one month, two members ticked (nothing is invoiced)
  const project = page.getByPlaceholder('Escriu el nom del projecte...')
  await project.fill('Jornades de sobirania')
  await page.locator('.dropdown-item', { hasText: 'Jornades de sobirania alimentària' }).first().click()
  await settle(page, 1000)
  const month = page.locator('[aria-label="Mes d\'entrega"] button', { hasText: '10/2026' })
  await month.click()
  await settle(page, 400)
  const rows = page.locator('.inv-table tbody tr:not(.month-row) .col-check input[type=checkbox]')
  await rows.nth(0).check({ force: true })
  await rows.nth(1).check({ force: true })
  await settle(page, 400)
  await shot(page, 'facturar-seleccio')

  // Informe de comandes: KPIs and charts of 2026, every month
  await page.goto('#/orders-stats')
  await page.getByText('Per tarifa').waitFor({ timeout: 60_000 })
  await settle(page, 1500)
  await page.getByRole('combobox', { name: 'Mes' }).selectOption({ label: 'Tots' })
  await settle(page, 2500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page, 600)
  await shot(page, 'informe')
  // the four group charts: «Per ruta» at the top of the window
  const byRoute = await page.locator('h2', { hasText: 'Per ruta' }).boundingBox()
  await page.evaluate(y => window.scrollBy(0, y), byRoute.y - 40)
  await settle(page, 800)
  await shot(page, 'informe-grups')

  // the member's Factures: log out and in as the provider «Mel Can Demo»
  await page.evaluate(() => localStorage.clear())
  await login(page, ...logUser('orders'))
  await closeHello(page)

  // reload: the side menu was built for the office user
  await page.goto('#/provider-invoices')
  await page.reload()
  await closeHello(page)
  await page.locator('.doc-kpi', { hasText: 'Total' }).waitFor()
  await settle(page, 1200)
  await closeHello(page)
  await shot(page, 'factures-socia')
})
