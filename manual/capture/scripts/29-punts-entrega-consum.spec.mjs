// 29. Punts d'entrega i de consum — the delivery points list and form (member and office view),
// unifying points, and the «Punts de consum» list where the lines of an order are ticked as picked up.
// Data: anonymized logistics copy (projectes_v5_manual_logistica), seen on 06/10/2026.
// Run with MANUAL_DATA=logistica. Nothing is saved:
// - the forms are only filled or submitted empty (the validation stops them), the unify modal is cancelled;
// - the copy has no pending point-of-consumption order, so the «Punts de consum» list is served by the
//   script (page.route) with one demo order («Punt de consum demo», lines «Persona demo N»), and the
//   «Recollit» click is answered by the script too: no request reaches the API.
// The help text under «Població» names a real person and phone (hard-coded in the app): it is masked.
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

const POINT = 1632 // Grup de consum El Portal 1632, of the provider persona51, two time slots

// the provider's welcome modal about pending invoices names the real cooperative: close it
async function closeHello (page) {
  const ok = page.getByRole('button', { name: "D'acord" })
  await ok.waitFor({ state: 'visible', timeout: 4_000 }).catch(() => {})
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

// the hard-coded help text with a real name and phone
const carla = page => page.locator('.help', { hasText: 'posa’t en contacte' })
const masked = page => ({ mask: [carla(page)], maskColor: '#d9dde3' })

async function tall (page, fn, height = 1700) {
  await page.setViewportSize({ width: 1440, height })
  await settle(page, 400)
  await fn()
  await page.setViewportSize({ width: 1440, height: 900 })
}

const demoOrder = (id, picked) => ({
  id,
  status: 'processed',
  pickup_point: true,
  estimated_delivery_date: '2026-10-07',
  contact: { id: 999001, name: 'Punt de consum demo', trade_name: 'Punt de consum demo' },
  route: { id: 12, name: 'DC - BCN CIUTAT' },
  lines: [
    { name: 'Persona demo 1', nif: 'I-00000001', units: 1, kilograms: 6, picked_up: picked },
    { name: 'Persona demo 2', nif: 'I-00000002', units: 2, kilograms: 11, picked_up: false },
    { name: 'Persona demo 3', nif: 'I-00000003', units: 1, kilograms: 4, picked_up: false }
  ]
})

test('29-punts-entrega-consum', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '29-punts-entrega-consum', { today: '2026-10-06' })

  // ---- the provider (orders)
  await login(page, ...logUser('orders'))
  await closeHello(page)
  await page.goto('#/clientes')
  await page.getByText("On s'entreguen les comandes: botigues").waitFor()
  await settle(page, 1500)
  await closeHello(page)
  await shot(page, 'llista-socia')

  // search
  await page.getByPlaceholder('Cerca per nom, NIF, població o ruta').fill('Riudellots')
  await settle(page, 400)
  await shot(page, 'cerca-socia')

  // a point of hers
  await page.goto(`#/punt-entrega/${POINT}`)
  await page.getByText('Condicions d’entrega').waitFor()
  await settle(page, 1200)
  await tall(page, async () => {
    await shot(page, 'fitxa-socia', masked(page))
  }, 1830)

  // a new point, saved empty: the required fields turn red
  await page.goto('#/clientes')
  await page.getByText("On s'entreguen les comandes: botigues").waitFor()
  await settle(page, 800)
  await page.getByRole('button', { name: "Nou punt d'entrega" }).click()
  await page.getByText('Condicions d’entrega').waitFor()
  await settle(page, 1000)
  await tall(page, async () => {
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await page.getByText('Error. Hi ha camps incorrectes').waitFor()
    await settle(page, 300)
    await shot(page, 'nou-buit', { keepToasts: true, ...masked(page) })
  }, 1750)

  // the «Punts de consum» list, member side (demo order served by the script)
  let picked = false
  await page.route(/\/orders\?_where\[pickup_point\]=true/, route => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({ json: [demoOrder(9001, picked)] })
  })
  await page.route(/\/contacts\?users_permissions_user=/, route => route.fulfill({ json: [] }))
  await page.route(/\/orders\/9001$/, route => {
    picked = true
    return route.fulfill({ json: demoOrder(9001, true) })
  })
  await page.goto('#/punts-recollida')
  await page.getByText('Persona demo 1').waitFor()
  await settle(page, 600)
  await shot(page, 'punts-consum')
  await page.getByRole('button', { name: 'Recollit' }).first().click()
  await page.getByText('Línea marcada com recollida correctament').waitFor()
  await settle(page, 300)
  const table = await page.locator('.list-box').boundingBox()
  await shot(page, 'punts-consum-recollit', { keepToasts: true, clip: { x: table.x - 8, y: table.y - 60, width: table.width + 16, height: Math.min(table.height + 140, 820 - table.y + 60) } })
  await page.unroute(/\/orders\?_where\[pickup_point\]=true/)
  await page.unroute(/\/contacts\?users_permissions_user=/)
  await page.unroute(/\/orders\/9001$/)

  // ---- the office (orders_admin)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
  await login(page, ...logUser('admin'))
  // a fresh page, or the side menu keeps the provider's entries
  await page.reload()
  await settle(page, 800)
  await page.goto('#/clientes')
  await page.getByText("On s'entreguen les comandes: botigues").waitFor()
  await page.getByRole('columnheader', { name: 'Contacte de' }).waitFor()
  await settle(page, 1500)
  await page.getByPlaceholder('Cerca per nom, NIF, població o ruta').fill('Riudellots')
  await settle(page, 500)
  await shot(page, 'llista-oficina')

  await page.goto(`#/punt-entrega/${POINT}`)
  await page.getByText('Condicions d’entrega').waitFor()
  await settle(page, 1200)
  await page.locator('.field', { hasText: 'Punt de consum' }).locator('.switch').click()
  await page.getByText('Usuària ESSTRAPIS').waitFor()
  await settle(page, 300)
  await tall(page, async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await settle(page, 300)
    await shot(page, 'fitxa-oficina', masked(page))
  }, 2260)

  // unify points: the modal, cancelled
  await page.goto('#/clientes')
  await page.getByRole('columnheader', { name: 'Contacte de' }).waitFor()
  await settle(page, 800)
  await page.getByRole('button', { name: 'Unifica punts' }).click()
  await page.getByText("Unificar punts d'entrega").waitFor()
  await settle(page, 400)
  await shot(page, 'unificar')
  await page.getByRole('button', { name: 'Cancel·lar' }).click()
})
