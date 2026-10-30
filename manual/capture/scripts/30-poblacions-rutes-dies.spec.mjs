// 30. Poblacions, rutes i dies — «Rutes i dies» (member and office), «Poblacions i rutes»,
// «Poblacions i punts» and «Rutes» (create, edit, deactivate).
// Data: anonymized logistics copy (projectes_v5_manual_logistica), seen on 06/10/2026.
// Run with MANUAL_DATA=logistica.
// Writes: one closure of route 12 «DC - BCN CIUTAT» on 28/10/2026, made by clicking its cell in
// «Rutes i dies» and removed straight away by clicking it again. Everything else is opened and
// cancelled: the route forms (new and edit) are never saved (saving a route that doesn't transfer
// would also clear its transfer point), and the deactivation dialog is cancelled.
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

const ROUTE = 'DC - BCN CIUTAT' // id 12, Wednesday, 3 towns
const CLOSE_DAY = 'dc 28/10'

async function closeHello (page) {
  const ok = page.getByRole('button', { name: "D'acord" })
  await ok.waitFor({ state: 'visible', timeout: 4_000 }).catch(() => {})
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

async function tall (page, fn, height = 1500) {
  await page.setViewportSize({ width: 1440, height })
  await settle(page, 400)
  await fn()
  await page.setViewportSize({ width: 1440, height: 900 })
}

const routeRow = page => page.locator('tr', { has: page.locator('th.rd-route', { hasText: ROUTE }) })

test('30-poblacions-rutes-dies', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '30-poblacions-rutes-dies', { today: '2026-10-06' })

  // ---- the provider (orders): read only
  await login(page, ...logUser('orders'))
  await closeHello(page)
  await page.goto('/rutes-dies')
  await page.getByText('Oberta en dia festiu').waitFor()
  await settle(page, 1500)
  await closeHello(page)
  await tall(page, async () => { await shot(page, 'rutes-dies-socia') })

  await page.goto('/poblacions-rutes')
  await page.getByText('Quina ruta passa per…?').waitFor()
  await settle(page, 1200)
  await page.getByPlaceholder('Escriu una població').fill('Riudellots')
  await settle(page, 400)
  await shot(page, 'poblacions-rutes-socia')

  // ---- the office (orders_admin)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
  await login(page, ...logUser('admin'))
  await page.reload() // a fresh side menu
  await settle(page, 800)

  await page.goto('/rutes-dies')
  await page.getByText('clica un dia per obrir o tancar la ruta').waitFor()
  await settle(page, 1500)
  await tall(page, async () => { await shot(page, 'rutes-dies-oficina') })

  // close a day of a route and open it again
  const cell = routeRow(page).locator('button.rd-cell', { hasText: CLOSE_DAY })
  await cell.click()
  await settle(page, 600)
  await cell.locator('text=Tancada').waitFor()
  const row = await routeRow(page).boundingBox()
  await shot(page, 'tancar-dia', { clip: { x: row.x, y: row.y - 4, width: row.width, height: row.height + 8 } })
  await cell.click()
  await settle(page, 600)
  await cell.locator('text=Oberta').waitFor()

  // weeks back: a closed route and an open route on a holiday (September)
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Setmanes anteriors' }).click()
    await settle(page, 300)
  }
  await settle(page, 800)
  await tall(page, async () => { await shot(page, 'rutes-dies-setembre') })

  // towns and routes
  await page.goto('/poblacions-rutes')
  await page.getByText('Nova població').waitFor()
  await settle(page, 1200)
  await page.locator('section.cr-route', { hasText: ROUTE }).locator('.cr-route-toggle').click()
  await settle(page, 400)
  await tall(page, async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await settle(page, 300)
    await shot(page, 'poblacions-rutes-oficina')
  }, 1300)
  const box = page.locator('section.cr-route', { hasText: ROUTE })
  await box.scrollIntoViewIfNeeded()
  await settle(page, 300)
  await shot(page, 'ruta-poblacions', { clip: await box.boundingBox() })

  await page.getByPlaceholder('Escriu una població').fill('Riudellots')
  await settle(page, 400)
  const side = page.locator('aside.cr-side section.a-box').first()
  await shot(page, 'quina-ruta-oficina', { clip: await side.boundingBox() })

  // towns written in delivery points that are not in the list
  await page.goto('/poblacions-punts-entrega')
  await page.getByText('Població als punts').waitFor()
  await settle(page, 1200)
  await shot(page, 'poblacions-punts')

  // routes
  await page.goto('/rutes')
  await page.getByRole('button', { name: 'Nova ruta' }).waitFor()
  await settle(page, 1200)
  await tall(page, async () => { await shot(page, 'rutes') }, 1150)

  // edit a route (cancelled)
  await page.locator('tr', { hasText: ROUTE }).first().getByRole('button', { name: 'Edita' }).click()
  await page.getByText(`Edita ${ROUTE}`).waitFor()
  await settle(page, 500)
  await shot(page, 'edita-ruta')
  await page.getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 400)

  // a new route with a repeated name and no day: the checks (nothing is sent; an empty name is
  // stopped by the browser itself)
  await page.getByRole('button', { name: 'Nova ruta' }).click()
  await page.locator('.modal-card-title', { hasText: 'Nova ruta' }).waitFor()
  await page.locator('.modal-card input').first().fill(ROUTE)
  await page.getByRole('checkbox', { name: 'Fa transferències' }).check({ force: true })
  await page.locator('.modal-card .field', { hasText: 'Descompte (€)' }).last().locator('input').fill('1.5')
  await page.getByRole('button', { name: 'Desa' }).click()
  await page.getByText('Tria almenys un dia').waitFor()
  await settle(page, 300)
  await shot(page, 'nova-ruta-errors')
  await page.getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 400)

  // deactivating asks first (cancelled)
  await page.locator('tr', { hasText: ROUTE }).first().locator('.switch').click()
  await page.getByText(`Desactivar ${ROUTE}`).waitFor()
  await settle(page, 400)
  await shot(page, 'desactivar')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 400)
  // note: after «Cancel·la» the route is still active (nothing was sent), but its switch stays drawn
  // off until the page is reloaded (seen 2026-10-18)
})
