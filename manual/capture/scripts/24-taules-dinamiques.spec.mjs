// 24. Com funcionen les taules dinàmiques — the pivot table of the projects report: saved
// views, expanding rows, the configuration panel, saving a view and exporting.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// the save-view dialog is cancelled.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('24-taules-dinamiques', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '24-taules-dinamiques', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/stats-projectes')
  const pivot = page.locator('.k-pivot-table, .k-pivotgrid').first()
  await pivot.waitFor({ timeout: 60_000 })
  await settle(page, 2500)
  const toolbar = page.locator('.pivot-views-toolbar').first()
  await toolbar.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80) })
  await settle(page, 600)
  await shot(page, 'taula')

  // unfold the first row header (the small triangle)
  // the triangle before «ÀMBITS (TOTS)» (columns) and «Projectes (TOTS)» (rows)
  const expander = page.locator('.k-pivot-rowheaders').getByText('Projectes (TOTS)').first().locator('xpath=preceding-sibling::span[contains(@class,"k-icon")][1] | self::*').first()
  if (await expander.count()) {
    await expander.click()
    await settle(page, 1500)
    await toolbar.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80) })
    await settle(page, 400)
    await shot(page, 'desplegat')
  }

  await page.getByRole('button', { name: 'Configura la taula dinàmica' }).first().click()
  await settle(page, 1200)
  await toolbar.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80) })
  await settle(page, 400)
  await shot(page, 'configuracio')
  await page.getByRole('button', { name: 'Amaga la configuració' }).first().click()
  await settle(page, 600)

  await page.getByRole('button', { name: 'Desa la vista' }).first().click()
  await page.getByText('Guardar nova vista').waitFor()
  await settle(page, 500)
  await shot(page, 'desa-vista')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·lar' }).click()
  await settle(page, 400)
})
