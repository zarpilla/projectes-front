// 21. IVA — the VAT still to settle with the tax office: executed and expected, by document
// and by quarter. Data: anonymized copy of resilience (projectes_v5_manual), seen on
// 17/06/2026. Read-only: nothing is settled.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('21-iva', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '21-iva', { today: '2026-06-17' })
  await login(page)

  await page.goto('/iva')
  await page.locator('h2', { hasText: 'IVA pendent de saldar' }).waitFor({ timeout: 60_000 })
  await settle(page, 2000)
  await shot(page, 'resum')

  const views = page.getByRole('tablist', { name: 'Vista' })
  await views.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20) })
  await settle(page, 400)
  await shot(page, 'documents')
  for (const [label, name] of [['Trimestres executats', 'trimestres-executats'], ['Trimestres previstos', 'trimestres-previstos'], ['Documents previstos', 'documents-previstos']]) {
    await views.getByRole('tab', { name: new RegExp(label) }).or(views.getByRole('button', { name: new RegExp(label) })).first().click()
    await settle(page, 1200)
    await views.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20) })
    await settle(page, 300)
    await shot(page, name)
  }
})
