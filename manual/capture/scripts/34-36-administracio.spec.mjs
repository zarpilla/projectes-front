// 34–36. Administració — the general configuration (34), the auxiliary tables (35) and the
// yearly setup and recalculation (36). Data: anonymized copy of resilience
// (projectes_v5_manual), seen on 17/06/2026. Read-only: no form is saved and «Actualitza tot»
// is not clicked. Each chapter gets its own image folder.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const toTop = (locator, offset = 20) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('34-configuracio-general', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '34-configuracio-general', { today: '2026-06-17' })
  await login(page)
  await page.goto('/administracio/configuracio')
  await page.locator('h2', { hasText: 'Entitat' }).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'entitat')
  for (const [title, name] of [['Comptes bancaris', 'comptes'], ['Textos de peu', 'peus'], ['Projectes', 'projectes'],
    ['Persones i dietes', 'persones-dietes'], ['Opcions', 'opcions']]) {
    await toTop(page.locator('h2', { hasText: title }).first(), 40)
    await settle(page, 400)
    await shot(page, name)
  }
})

test('35-taules-auxiliars', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '35-taules-auxiliars', { today: '2026-06-17' })
  await login(page)
  await page.goto('/administracio/estats-projecte')
  await settle(page, 1500)
  await shot(page, 'estats-projecte')
  await page.goto('/administracio/estats-projecte/1')
  await settle(page, 1500)
  await shot(page, 'estat-fitxa')
  await page.goto('/administracio/series')
  await settle(page, 1500)
  await shot(page, 'series')
  await page.goto('/administracio/tipus-despesa')
  await settle(page, 1500)
  await shot(page, 'tipus-despesa')
  await page.goto('/administracio/comptes-bancaris')
  await settle(page, 1500)
  await shot(page, 'comptes-bancaris')
  await page.goto('/administracio/tipus-festiu')
  await settle(page, 1500)
  await shot(page, 'tipus-festiu')
})

test('36-inici-any-manteniment', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '36-inici-any-manteniment', { today: '2026-06-17' })
  await login(page)
  await page.goto('/administracio/anys')
  await settle(page, 1500)
  await shot(page, 'anys')
  const row = page.locator('a[href*="/administracio/anys/"]').first()
  if (await row.count()) {
    await row.click()
    await settle(page, 1500)
    await shot(page, 'any-fitxa')
  }
  await page.goto('/administracio/festius-usuari')
  await settle(page, 1500)
  await shot(page, 'festius')
  await page.goto('/recalcul')
  await page.getByRole('button', { name: 'Actualitza tot' }).waitFor({ timeout: 30_000 })
  await settle(page, 2000)
  await shot(page, 'recalcul')
})
