// 20. Bestretes (nòmines) — a person's advances month by month: hours worked and expected,
// balance, salary and the payroll of each month. Data: anonymized copy of resilience
// (projectes_v5_manual), seen on 17/06/2026. Read-only: no payroll is created, paid or
// deleted. Clara Serra (32) has 12 payrolls in 2026, 6 of them paid.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('20-bestretes', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '20-bestretes', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/salary')
  await page.getByPlaceholder('Persona').waitFor()
  await settle(page, 1000)
  await page.getByPlaceholder('Persona').fill('Clara Serra')
  await page.locator('.dropdown-item', { hasText: 'Clara Serra' }).first().click()
  await page.getByPlaceholder('Persona').press('Escape')
  await page.locator('h1').first().click()
  await page.getByText('Nòmines per mes').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'persona')
  await page.getByText('Nòmines per mes').evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -40) })
  await settle(page, 400)
  await shot(page, 'mesos')

  // a payroll: the eye button opens it in a new tab (here, in the same page: a new tab
  // wouldn't get start()'s API redirection). Payroll 2075 is Clara Serra's January 2026.
  await page.goto('#/document/2075/payrolls')
  await page.locator('.card-header-title', { hasText: 'Document' }).first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'nomina')
})
