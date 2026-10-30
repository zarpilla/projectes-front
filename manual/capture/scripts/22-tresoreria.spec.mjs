// 22. Tresoreria — the cash forecast: balances, month-end chart, accounts, monthly forecast,
// the per-project pivot, the bank movements and the «Nova operació» dialog.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// the operations dialog is closed without sending, nothing is validated.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const toTop = (locator, offset = 20) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)
const head = (page, text) => page.locator('h2', { hasText: text }).first()

test('22-tresoreria', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '22-tresoreria', { today: '2026-06-17' })
  await login(page)

  await page.goto('/tresoreria')
  await page.getByText('Comptes', { exact: true }).last().waitFor({ timeout: 60_000 })
  await page.getByText('Gener', { exact: true }).first().waitFor({ timeout: 60_000 })
  await settle(page, 2500)
  await shot(page, 'resum')

  await toTop(head(page, 'Comptes'), 40)
  await settle(page, 400)
  await shot(page, 'comptes')
  await toTop(head(page, 'Previsió mensual'), 40)
  await settle(page, 400)
  await shot(page, 'previsio-mensual')

  await toTop(head(page, 'Per projecte'), 40)
  await page.locator('.k-pivot-table').first().waitFor({ timeout: 30_000 }).catch(() => {})
  await settle(page, 1500)
  await shot(page, 'per-projecte')

  await toTop(head(page, 'Moviments bancaris'), 40)
  await settle(page, 600)
  await shot(page, 'moviments')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Nova operació' }).click()
  await page.getByText('Operacions de tresoreria').waitFor()
  await settle(page, 600)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await shot(page, 'nova-operacio')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Tanca' }).click()
  await settle(page, 400)
})
