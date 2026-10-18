// 26. Informes de dedicació — «Dedicació» (planned and worked hours by month, person and
// project) and «% Dedicació real» (hours worked against each person's workday).
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('26-informes-dedicacio', async ({ page }) => {
  test.setTimeout(400_000)
  await start(page, '26-informes-dedicacio', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/stats-dedicacio')
  await page.getByText('Hores fetes').first().waitFor({ timeout: 60_000 })
  await page.locator('h2', { hasText: 'Per persona' }).waitFor({ timeout: 60_000 })
  await settle(page, 2500)
  await shot(page, 'dedicacio')
  await page.locator('h2', { hasText: 'Per persona' }).evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -40) })
  await settle(page, 600)
  await shot(page, 'dedicacio-persones')

  await page.goto('#/stats-real-gantt')
  await page.getByText('per persona').first().waitFor({ timeout: 60_000 })
  await settle(page, 2500)
  await shot(page, 'dedicacio-real')
  const cell = page.locator('td.period-cell', { has: page.locator('.cell-content:not(.is-none)') }).nth(4)
  if (await cell.count()) {
    await cell.click()
    await settle(page, 600)
    await shot(page, 'dedicacio-real-detall')
  }
})
