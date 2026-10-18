// Logistics (LOGÍSTICA): a town on a route ("Poblacions i rutes"), a delivery point,
// an order for it (route, date, boxes, pickup), the order view, an incidence, the
// deposit, changing the state from the list, invoicing the delivered orders to a
// project ("Facturar comandes"), the invoice in the member's "Factures", and cancelling.
//
// Routes, pickups and delivery types can't be created through the API: they come
// from logistics-fixture.sql (loaded by the e2e workflow next to the sentinel). The
// user gets the "orders" and "orders_admin" permissions here, as the logistics staff
// that runs these screens.

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, env, login, NAME, STAMP, visit, settle, field, button, modal,
  expectSnackbar, confirmDialog, createProject, pickAutocomplete
} from './helpers.mjs'

useE2E()

const TOWN = `${NAME} Vila`
const POINT = `${NAME} Botiga`
const idOf = relation => relation?.id ?? relation
const ordersOf = contactId => api('GET', `orders?_where[contact]=${contactId}&_limit=-1&_sort=id:ASC`)

test('setup: the logistics permissions, the member contact and a project', async () => {
  state.route = (await api('GET', 'routes?_where[name]=E2E Ruta&_limit=1'))[0]
  state.pickup = (await api('GET', 'pickups?_where[name]=E2E Magatzem&_limit=1'))[0]
  expect(state.route && state.pickup, 'the logistics fixture (logistics-fixture.sql) is loaded').toBeTruthy()

  const permissions = new Set([...(state.me.permissions || []).map(p => p.permission), 'orders', 'orders_admin'])
  await api('PUT', `users/${state.me.id}`, { permissions: [...permissions].map(permission => ({ permission })) })
  // the app keeps the user and its permissions from the login, and caches users/me
  await page.evaluate(() => localStorage.clear())
  await login(page, env.E2E_USER, env.E2E_PASSWORD)
  await page.reload()

  // the member ("sòcia") contact: orders are invoiced to the user's first one
  ;[state.member] = await api('GET', `contacts?_where[users_permissions_user]=${state.me.id}&_sort=id:ASC&_limit=1`)
  state.member ??= await api('POST', 'contacts', { data: { name: `${NAME} sòcia`, nif: `E2ES${STAMP}`, users_permissions_user: state.me.id } })
  // invoicing adds the orders as an income of a project's phase
  state.projectName = `${NAME} logística`
  state.projectId = await createProject(state.projectName, { incomes: [{ concept: 'Comandes', quantity: 1, price: 100 }] })
})

test('"Poblacions i rutes": a new town, linked to a route', async () => {
  await visit('/city-route')
  await page.getByPlaceholder('Població', { exact: true }).fill(TOWN)
  await page.locator('button[title="Nova població"]').click()
  await confirmDialog('Vols afegir la població?')
  await settle()
  ;[state.city] = await api('GET', `cities?_where[name]=${encodeURIComponent(TOWN)}&_limit=1`)
  expect(state.city).toBeTruthy()

  // the new town opens in "Quina ruta passa per…?": add the route there
  const town = page.locator('.town-card', { hasText: TOWN }).first()
  await expect(town).toContainText('Cap ruta hi passa')
  await town.locator('select').selectOption({ label: state.route.name })
  await settle()
  await expect(town.locator('.route-chip', { hasText: state.route.short_name || state.route.name })).toBeVisible()
  const links = await api('GET', `city-routes?_where[city]=${state.city.id}&_limit=-1`)
  expect(links.map(l => idOf(l.route))).toEqual([state.route.id])
})

test('a new delivery point ("Nou punt d\'entrega")', async () => {
  test.skip(!state.city, 'needs the town')
  await visit('/contact-user/0')
  await field('Contacte de').locator('select').selectOption(String(state.me.id))
  await pickAutocomplete('Població', TOWN)
  await field('CP').locator('input').fill('08001')
  await field('Adreça').locator('input').fill('Carrer de les Proves, 1')
  await field('Nom comercial').locator('input').fill(POINT)
  await field('Raó Social').locator('input').fill(`${POINT} SCCL`)
  await button('E2E Sector').click()
  await field('NIF').locator('input').first().fill(`E2EP${STAMP}`)
  const slot1 = field('Horari de contacte 1').locator('select')
  await slot1.nth(0).selectOption({ label: '9.00' })
  await slot1.nth(1).selectOption({ label: '14.00' })
  await field('Horari de contacte 2').getByText('No obren').click()
  await field('Telèfon').locator('input').fill('600 000 001')
  await button('Guardar').click()
  await expectSnackbar('Guardat')

  ;[state.point] = await api('GET', `contacts?_where[trade_name]=${encodeURIComponent(POINT)}&_limit=1`)
  expect(state.point).toMatchObject({ trade_name: POINT, city: TOWN, postcode: '08001', time_slot_1_ini: 9, time_slot_1_end: 14 })
  expect(idOf(state.point.owner)).toBe(state.me.id)
})

test('an order for the delivery point', async () => {
  test.skip(!state.point, 'needs the delivery point')
  await visit('/order/0')
  await field('Sòcia').locator('select').selectOption(String(state.me.id))
  const contact = page.getByPlaceholder("Punt d'entrega")
  await contact.click()
  await contact.pressSequentially(POINT, { delay: 20 })
  await page.locator('.autocomplete .dropdown-item', { hasText: POINT }).filter({ visible: true }).first().click()
  await settle()
  // the town has one route: it is chosen, with its next delivery date
  await expect(button(state.route.name)).toHaveClass(/is-warning/)
  await field('Número de caixes').locator('input').fill('2')
  await field('Kilograms').locator('input').fill('10')
  await button(state.pickup.name).click()
  await button('Guardar').click()
  await expect(page).toHaveURL(/\/order\/[1-9]\d*/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.orderId = Number(page.url().match(/\/order\/(\d+)/)[1])

  const order = await api('GET', `orders/${state.orderId}`)
  expect(order).toMatchObject({ status: 'pending', units: 2, kilograms: 10, contact_trade_name: POINT, contact_city: TOWN })
  expect(idOf(order.route)).toBe(state.route.id)
  expect(idOf(order.pickup)).toBe(state.pickup.id)
  expect(idOf(order.owner)).toBe(state.me.id)
  expect(order.estimated_delivery_date).toBeTruthy()
})

test('the order is listed in "Comandes" and shown in its view', async () => {
  test.skip(!state.orderId, 'needs the order')
  await visit('/orders')
  await expect(page.locator('table tbody tr', { hasText: POINT }).first()).toBeVisible()
  await visit(`/order/view/${state.orderId}`)
  await expect(page.getByText(POINT).first()).toBeVisible()
})

test('the column filters and the quick edit of "Comandes"', async () => {
  test.skip(!state.orderId, 'needs the order')
  await visit('/orders')
  // a column filter goes to the API: only this order's point is left
  await page.getByLabel("Filtra Punt d'entrega").fill(POINT)
  await settle()
  const row = page.locator('tr.order-row', { hasText: POINT }).first()
  await expect(row).toBeVisible()
  await expect(page.locator('tr.order-row')).toHaveCount(1)
  // quick edit in the row: 3 boxes
  await row.locator('button[title="Edició ràpida"]').click()
  const editing = page.locator('tr.order-row.is-editing')
  await editing.locator('input[type="number"]').first().fill('3')
  await editing.locator('button[aria-label="Desa"]').click()
  await expectSnackbar('Comanda actualitzada correctament')
  await settle()
  expect((await api('GET', `orders/${state.orderId}`)).units).toBe(3)
})

test('an incidence is created from the order', async () => {
  test.skip(!state.orderId, 'needs the order')
  await visit(`/order/${state.orderId}`)
  await button('Crear incidència').click()
  const box = modal('Crear Incidència')
  await expect(box).toBeVisible()
  await field('Descripció de la incidència', box).locator('textarea').fill(`${NAME} caixa trencada`)
  await button('Crear incidència', box).click()
  await expect(box).toBeHidden()
  await settle()
  const incidences = await api('GET', `incidences?_where[order]=${state.orderId}&_limit=-1`)
  expect(incidences.map(i => i.description)).toEqual([`${NAME} caixa trencada`])

  await visit('/incidences')
  await expect(page.getByText(`${NAME} caixa trencada`).first()).toBeVisible()
})

test('"Dipositar" from the order view, and undoing it', async () => {
  test.skip(!state.orderId, 'needs the order')
  await visit(`/order/view/${state.orderId}`)
  await button('Dipositar').click()
  await expectSnackbar('Comanda dipositada correctament')
  await settle()
  let order = await api('GET', `orders/${state.orderId}`)
  expect(order.deposit_date).toBeTruthy()
  expect(order.status).toBe('pending')

  await button('Desfer dipòsit').click()
  await confirmDialog('eliminar la informació de dipòsit')
  await settle()
  order = await api('GET', `orders/${state.orderId}`)
  expect(order.deposit_date).toBeFalsy()
})

test('the selection bar marks the order delivered ("Canvia l\'estat a…")', async () => {
  test.skip(!state.orderId, 'needs the order')
  await visit('/orders')
  const row = page.locator('table tbody tr.order-row', { hasText: POINT }).first()
  await row.locator('.checkbox, .b-checkbox').first().click()
  const bar = page.locator('.selection-bar')
  await bar.locator('select').selectOption('delivered')
  await button('Aplica', bar).click()
  await settle()
  const order = await api('GET', `orders/${state.orderId}`)
  expect(order.status).toBe('delivered')
  expect(order.delivery_date).toBeTruthy()
})

test('delivered orders are invoiced to the member ("Facturar comandes")', async () => {
  test.skip(!state.orderId || !state.projectId, 'needs the delivered order and the project')
  const invoicesOfMember = () => api('GET', `emitted-invoices?_where[contact]=${state.member.id}&_limit=-1&_sort=id:ASC`)
  const before = await invoicesOfMember()
  await visit('/orders-invoice')
  const input = page.getByPlaceholder('Escriu el nom del projecte...')
  await input.click()
  await input.pressSequentially(state.projectName, { delay: 20 })
  await page.locator('.autocomplete .dropdown-item', { hasText: state.projectName }).filter({ visible: true }).first().click()
  await button('Factura').click()
  await expectSnackbar('Comandes facturades correctament')

  const order = await api('GET', `orders/${state.orderId}`)
  expect(order.status).toBe('invoiced')
  // one draft invoice for the member, for the project
  const invoices = await invoicesOfMember()
  expect(invoices).toHaveLength(before.length + 1)
  state.invoice = invoices.at(-1)
  expect(state.invoice.code).toBe('ESBORRANY')
  expect(state.invoice.projects.map(idOf)).toEqual([state.projectId])
})

test('the invoice is in the member\'s "Factures"', async () => {
  test.skip(!state.invoice, 'needs the invoice')
  await visit('/provider-invoices')
  await expect(page.locator('table tbody tr').first()).toBeVisible()
  await expect(page.locator('table tbody')).toContainText(String(state.invoice.code || 'ESBORRANY'))
})

test('"Anul·la la comanda" cancels an order', async () => {
  test.skip(!state.orderId, 'needs a first order to copy')
  const first = await api('GET', `orders/${state.orderId}`)
  const copy = { ...first, status: 'pending', emitted_invoice: null, delivery_date: null, invoiced: false }
  for (const key of ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'incidences', 'emitted_invoice']) delete copy[key]
  for (const key of ['route', 'pickup', 'contact', 'owner', 'delivery_type']) copy[key] = idOf(first[key])
  const second = await api('POST', 'orders', { data: copy })

  await visit(`/order/${second.id}`)
  await button('Anul·la la comanda').click()
  await confirmDialog('anul·lar la comanda')
  await settle()
  expect((await api('GET', `orders/${second.id}`)).status).toBe('cancelled')
  expect((await ordersOf(state.point.id)).map(o => o.status)).toEqual(['invoiced', 'cancelled'])
})
