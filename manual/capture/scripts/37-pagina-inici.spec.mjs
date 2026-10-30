// 37. La pàgina d'inici — the pinned entries, «Tot el menú», ordering the tiles, «En entrar, obre»
// and the star in the side menu. Data: anonymized copy of resilience (projectes_v5_manual), seen
// on 17/06/2026. Writes the manual user's Inici choice (users/me/home); the end of the script
// sets it back to the default entries and «L'inici».
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('37-pagina-inici', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '37-pagina-inici', { today: '2026-06-17' })

  await login(page)
  await page.goto('/inici')
  await page.getByText('Els meus accessos').waitFor()
  // start from the defaults, opening on Inici
  await page.getByRole('button', { name: 'Restableix els accessos' }).click()
  await page.getByRole('radio', { name: "L'inici" }).check()
  await settle(page, 2500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page, 300)
  await shot(page, 'inici')

  const all = page.locator('section.home-card', { hasText: 'Tot el menú' })
  await all.scrollIntoViewIfNeeded()
  await settle(page, 400)
  await shot(page, 'tot-el-menu', { clip: await all.boundingBox() })

  // pin Tresoreria and Previsió facturació
  await page.getByRole('button', { name: "Fixa a l'inici: Tresoreria" }).click()
  await page.getByRole('button', { name: "Fixa a l'inici: Previsió facturació" }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('.home-saved', { hasText: 'Desat' }).waitFor()
  await settle(page, 200)
  await shot(page, 'accessos-fixats')

  // search the menu
  await page.getByRole('searchbox', { name: 'Cerca al menú' }).fill('factur')
  await settle(page, 400)
  await all.scrollIntoViewIfNeeded()
  await shot(page, 'cerca', { clip: await all.boundingBox() })
  await page.getByRole('searchbox', { name: 'Cerca al menú' }).fill('')

  // ordering mode: arrows on each tile
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Ordena els accessos' }).click()
  await page.getByRole('button', { name: 'Mou Tresoreria enrere' }).click()
  await page.getByRole('button', { name: 'Mou Tresoreria enrere' }).click()
  await settle(page, 2200)
  const pins = page.locator('section.home-card', { hasText: 'Els meus accessos' })
  await shot(page, 'ordena', { clip: await pins.boundingBox() })
  await page.getByRole('button', { name: 'Fet' }).click()

  // «En entrar, obre»
  const foot = page.locator('.home-card-foot')
  await foot.scrollIntoViewIfNeeded()
  await settle(page, 300)
  const box = await foot.boundingBox()
  await shot(page, 'en-entrar-obre', { clip: { x: box.x, y: box.y - 8, width: box.width, height: box.height + 16 } })

  // the star in the side menu
  await page.goto('/projectes')
  await settle(page, 1500)
  const aside = await page.locator('aside').boundingBox()
  await shot(page, 'menu-lateral', { clip: { x: aside.x, y: aside.y, width: aside.width, height: Math.min(aside.height, 640) } })

  // back to the defaults
  await page.goto('/inici')
  await page.getByText('Els meus accessos').waitFor()
  await page.getByRole('button', { name: 'Restableix els accessos' }).click()
  await settle(page, 1500)
})
