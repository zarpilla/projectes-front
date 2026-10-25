// 28. Comandes — the orders list, a new order, the order form, the quick edit and the order's
// tracking page, seen by the three logistics profiles. Data: anonymized logistics copy
// (projectes_v5_manual_logistica, MANUAL_DATA=logistica), seen on 06/10/2026.
// Writes nothing: the new order is filled in and left unsaved, the quick edit is cancelled.
// Example records: pending order 24879 and collection order 24875 (member «Mel Can Demo»),
// processed order 24874 (deposited, with a transfer).
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

const TODAY = '2026-10-06'

// the provider's welcome modal about pending invoices names the real cooperative: close it
async function closeHello (page) {
  const ok = page.getByRole('button', { name: "D'acord" })
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

// a taller window for the long forms (the side menu and the save bar are fixed)
async function tall (page, fn, height = 1900) {
  await page.setViewportSize({ width: 1440, height })
  await settle(page, 400)
  await fn()
  await page.setViewportSize({ width: 1440, height: 900 })
}

// a form input by its label (the labels aren't tied to the inputs)
const field = (page, label) =>
  page.locator('.field', { has: page.locator('label', { hasText: label }) }).locator('input').first()

// log out and in again on the same page (the screenshot numbering goes on)
async function switchUser (page, profile) {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto('#/')
  await page.reload()
  await login(page, ...logUser(profile))
  await closeHello(page)
}

async function openOrders (page) {
  await page.goto('#/comandes')
  await page.getByText('Comandes actives').waitFor()
  await settle(page, 600)
}

// the list on Wednesday 07/10/2026, every status
async function dayOfOrders (page) {
  await page.getByRole('button', { name: 'Dia anterior' }).click() // empty date: picks today
  await settle(page, 300)
  await page.getByRole('button', { name: 'Dia següent' }).click()
  await settle(page, 300)
  await page.locator('.status-tabs button', { hasText: 'Totes' }).click()
  await settle(page, 800)
}

test('28-comandes (sòcia)', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '28-comandes', { today: TODAY })
  await login(page, ...logUser('orders'))
  await closeHello(page)

  // 01 the list as a provider
  await openOrders(page)
  await closeHello(page)
  await dayOfOrders(page)
  await shot(page, 'llista-socia')

  // 02 the import box
  await page.getByRole('button', { name: 'Importa CSV' }).click()
  await settle(page, 300)
  const imp = page.locator('.import-box')
  await shot(page, 'importa-csv', { clip: await imp.boundingBox() })
  await page.locator('.import-box button.delete').click()

  // a new order: «Guardar» with nothing filled in marks the missing fields
  await page.goto('#/comanda/0')
  await page.getByText('A on va i quin dia?').waitFor()
  await settle(page, 800)
  await closeHello(page)
  await tall(page, async () => {
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await settle(page, 600)
    await shot(page, 'camps-obligatoris')
  })
  await page.goto('#/comandes')
  await page.getByText('Comandes actives').waitFor()
  await page.goto('#/comanda/0')
  await page.getByText('A on va i quin dia?').waitFor()
  await settle(page, 800)

  // the point chosen: its routes; then route, service, boxes, kg, pickup
  const point = page.getByPlaceholder("Punt d'entrega")
  await point.click()
  await point.fill('Fleca Can Exemple')
  await settle(page, 600)
  await page.locator('.dropdown-item', { hasText: 'Fleca Can Exemple' }).first().click()
  await settle(page, 1200)
  const where = page.locator('section.a-box', { hasText: 'A on va i quin dia?' })
  await shot(page, 'punt-i-rutes', { clip: await where.boundingBox() })

  // a route that passes today: the date jumps a week and the warning shows
  await page.locator('button.pill', { hasText: 'DT - BCN CIUTAT' }).click()
  await settle(page, 800)
  await tall(page, async () => shot(page, 'ruta-tancada-avui', { clip: await where.boundingBox() }))

  await page.locator('button.pill', { hasText: 'DJ - BCN CIUTAT' }).click()
  await settle(page, 600)
  await page.locator('button.pill', { hasText: 'Refrigerada' }).click()
  await field(page, 'Número de caixes').fill('2')
  await field(page, 'Kilograms').fill('12')
  await page.locator('button.pill', { hasText: 'Magatzem Girona' }).click()
  await page.getByPlaceholder('Notes').fill('Comanda de demostració per al manual')
  await settle(page, 1200)
  await tall(page, () => shot(page, 'comanda-omplerta'))
  // left unsaved

  // the provider's view of an order's tracking
  await page.goto('#/comanda/veure/24874')
  await page.getByText('Recorregut').waitFor()
  await settle(page, 800)
  await shot(page, 'seguiment-socia')

  // ---- the office (orders_admin) ----
  await switchUser(page, 'admin')
  await openOrders(page)
  await dayOfOrders(page)
  await shot(page, 'llista-oficina')

  await page.getByRole('button', { name: 'Exporta' }).first().click()
  await settle(page, 300)
  const menu = page.locator('.export-menu .dropdown-menu')
  const mb = await menu.boundingBox()
  await shot(page, 'menu-exporta', { clip: { x: mb.x - 8, y: mb.y - 56, width: mb.width + 16, height: mb.height + 64 } })
  await page.keyboard.press('Escape')
  await page.mouse.click(700, 60)
  await settle(page, 300)

  // selection bar
  for (const id of ['24876', '24886']) {
    await page.locator('tr.order-row', { hasText: id }).locator('.col-check label').click()
  }
  await settle(page, 300)
  await page.locator('.selection-bar select').selectOption('delivered')
  await settle(page, 200)
  const bar = page.locator('.selection-bar')
  await bar.scrollIntoViewIfNeeded()
  await settle(page, 200)
  const bb = await bar.boundingBox()
  await shot(page, 'seleccio', { clip: { x: bb.x - 8, y: bb.y - 8, width: bb.width + 16, height: bb.height + 16 } })
  await page.locator('.selection-bar').getByRole('button', { name: 'Desmarca' }).click()

  // quick edit of a row, cancelled
  const row = page.locator('tr.order-row', { hasText: '24877' })
  await row.getByRole('button', { name: 'Edició ràpida' }).click()
  await row.scrollIntoViewIfNeeded()
  await settle(page, 500)
  // the edited row is wider than the box: scroll it to the price and the save buttons
  await page.locator('.orders-box .table-container').evaluate(e => { e.scrollLeft = e.scrollWidth })
  await settle(page, 300)
  const box = await page.locator('.orders-box').boundingBox()
  const rb = await row.boundingBox()
  await shot(page, 'edicio-rapida', { clip: { x: box.x, y: rb.y - 8, width: box.width, height: rb.height + 16 } })
  await page.locator('.orders-box .table-container').evaluate(e => { e.scrollLeft = 0 })
  await row.getByRole('button', { name: 'Cancel·la' }).click()

  // a processed order in the form, as the office
  await page.goto('#/comanda/24874')
  await page.getByText('Altres dades').waitFor()
  await settle(page, 1200)
  await tall(page, () => shot(page, 'fitxa-oficina'), 2100)

  // its tracking, with the next move as the main button
  await page.goto('#/comanda/veure/24876')
  await page.getByText('Recorregut').waitFor()
  await settle(page, 800)
  await shot(page, 'seguiment-oficina')

  // a collection order (-R)
  await page.goto('#/comanda/24875')
  await page.getByText('Comandes a recollir').waitFor()
  await settle(page, 1200)
  await tall(page, () => shot(page, 'comanda-de-recollida'), 1800)

  // a new order for a consumption point
  await openOrders(page)
  await page.getByRole('button', { name: 'Comanda punt de consum' }).click()
  await page.getByText('Línies *').waitFor()
  await settle(page, 800)
  const what = page.locator('section.a-box', { hasText: 'Què hem de portar?' })
  await tall(page, async () => shot(page, 'punt-de-consum', { clip: await what.boundingBox() }))
  // what happens on picking where it is left (checked for the chapter, no picture)
  await page.locator('button.pill', { hasText: 'Magatzem Girona' }).click()
  await settle(page, 500)
  console.log('lines still there after choosing a pickup:', await page.getByText('Línies *').isVisible())
})
