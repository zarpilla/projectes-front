// 16. Saldo d'hores i hores anuals — a person's hour balance (worked vs. workday, by month
// and day) and the yearly summary (holidays, agreement maximum, yearly balance).
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only.
// Clara Serra (32) has a complete workday and hours in 2026.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const PERSON = 'Clara Serra'

async function pickPerson (page) {
  const input = page.getByPlaceholder('Tria una persona')
  await input.fill(PERSON)
  await page.locator('.dropdown-item', { hasText: PERSON }).first().click()
  await input.press('Escape')
  await page.locator('h1').first().click()
}

const toTop = (locator, offset = 20) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('16-saldo-hores', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '16-saldo-hores', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/dedicacio-saldo')
  await page.getByPlaceholder('Tria una persona').waitFor()
  await settle(page, 800)
  await pickPerson(page)
  await page.getByText('Saldo acumulat').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'saldo')
  await toTop(page.locator('h2', { hasText: 'Per mes' }), 40)
  await settle(page, 400)
  await shot(page, 'saldo-mesos')
  await toTop(page.locator('th', { hasText: 'Festiu / absència' }).first(), 120)
  await settle(page, 400)
  await shot(page, 'saldo-dies')

  await page.goto('#/dedicacio-summary')
  await page.getByPlaceholder('Tria una persona').waitFor()
  await settle(page, 800)
  await pickPerson(page)
  await page.getByText('Saldo anual').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'anual')
  await toTop(page.locator('h2', { hasText: 'Com es calcula' }), 40)
  await settle(page, 400)
  await shot(page, 'anual-calcul')
})
