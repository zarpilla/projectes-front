// 14. Registre de jornada — clocking in and out, the month and year views of a person's
// workday log, and its PDF. Data: anonymized copy of resilience (projectes_v5_manual), seen
// on 17/06/2026. Read-only: nothing is clocked or edited. Clara Serra (32) has a complete
// log in May and June 2026.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('14-registre-jornada', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '14-registre-jornada', { today: '2026-06-17' })
  await login(page)

  await page.goto('/registre-jornades')
  await page.getByPlaceholder('Tria una persona').waitFor()
  await settle(page, 1000)
  await page.getByPlaceholder('Tria una persona').fill('Clara Serra')
  await page.locator('.dropdown-item', { hasText: 'Clara Serra' }).first().click()
  await page.getByText('Hores treballades').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  // the person list stays open after picking: close it
  await page.getByPlaceholder('Tria una persona').press('Escape')
  await page.locator('h1').first().click()
  await settle(page, 400)
  await shot(page, 'mes-actual')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Període anterior' }).click()
  await settle(page, 1500)
  await shot(page, 'mes-anterior')

  await page.getByRole('button', { name: 'Any sencer' }).click()
  await settle(page, 2000)
  await shot(page, 'any')
})
