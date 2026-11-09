// 21. IVA i IRPF — one layout for both since issues/418–419: a year, one or several
// quarters, the documents settled or pending, and «Salda» with the sum of the documents
// ticked. Data: anonymized copy of resilience (projectes_v5_manual), seen on 09/11/2026
// (IRPF: what was paid before 419 settled by the run-once). Read-only: documents are
// ticked to show the sum, nothing is settled.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const scrollTo = async (page, locator) => {
  await locator.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20) })
  await settle(page, 300)
}

test('21-iva', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '21-iva')
  await login(page)

  // IVA: the year, its quarters, the documents
  await page.goto('/iva')
  await page.locator('h2', { hasText: 'Per trimestre' }).waitFor({ timeout: 60_000 })
  await settle(page, 1500)
  await shot(page, 'resum')

  // two quarters at once (on this copy every 2026 document is settled: nothing to tick)
  const quarters = page.locator('.vat-quarter-table tbody tr')
  const count = await quarters.count()
  for (const i of [count - 2, count - 1].filter(i => i >= 0)) await quarters.nth(i).click()
  await settle(page, 600)
  await scrollTo(page, page.locator('.vat-views'))
  await shot(page, 'documents')

  // the forecast
  await page.getByRole('tab', { name: /^Previst/ }).click()
  await page.locator('h2', { hasText: 'Trimestres previstos' }).waitFor({ timeout: 60_000 })
  await settle(page, 1500)
  await scrollTo(page, page.locator('.vat-views'))
  await shot(page, 'previst')

  // IRPF: same layout; the pending ones of the year ticked
  await page.goto('/irpf')
  await page.locator('h2', { hasText: 'Per trimestre' }).waitFor({ timeout: 60_000 })
  await settle(page, 1500)
  await shot(page, 'irpf')
  await page.getByRole('combobox', { name: 'Estat' }).selectOption({ label: 'Pendents de saldar' })
  await settle(page, 400)
  await page.locator('.settle-bar').getByRole('button', { name: /Marca els pendents/ }).click()
  await settle(page, 400)
  await scrollTo(page, page.getByRole('tablist', { name: 'Origen' }))
  await shot(page, 'irpf-salda')
})
