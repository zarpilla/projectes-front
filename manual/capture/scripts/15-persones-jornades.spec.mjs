// 15. Persones i jornades laborals — each person's working-day periods (hours per day,
// salary, Social Security, cost per hour) on a yearly chart, and creating the year's advances.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// the period dialogs are cancelled and «Crear» is not clicked.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const modal = page => page.locator('.modal.is-active')

test('15-persones-jornades', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '15-persones-jornades', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/working-day')
  await page.locator('.gantt_task_line').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'persones')

  // a period: click its bar
  await page.locator('.gantt_task_line').first().click()
  await modal(page).getByText('Jornada', { exact: true }).waitFor()
  await settle(page, 600)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await shot(page, 'periode')
  await modal(page).getByRole('button', { name: /Cancel/ }).click()
  await settle(page, 600)

  // creating the advances of a year
  await page.locator('.card-header-title', { hasText: 'Crear Bestretes' }).evaluate(el => {
    el.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -20)
  })
  await settle(page, 400)
  await shot(page, 'crear-bestretes')
})
