// Farm pickups and their collection orders (-R), on a real backend and database.
// An order picked up at a farm ("Recollida en Finca") through a collection point
// goes into the -R of its owner, collection point, pickup route and day; the -R
// adds up the boxes and kilos of the orders it collects. Every bug the -R had in
// v5 was in the queries (v3 operators, unpopulated relations, an array that
// replaced the relation), which the unit tests stub, so this checks what the
// database ends up holding:
//   - a new order creates its -R, a second one of the same day joins it;
//   - saving an order without changes keeps it in its -R (re-saving 25432 did);
//   - moving the pickup day moves the order to the -R of the new day, and the old
//     one recomputes; cancelling the last order of a -R cancels it (issues/217, 292);
//   - a -R past pending takes no new orders: a new -R is created (issues/303);
//   - no pickup date in the past, in the form or through the API (issues/302).
//
// The farm pickup comes from logistics-fixture.sql. The town, the farm collection
// point and the delivery point are created here, through the API.

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, env, login, NAME, STAMP, visit, settle, field, button,
  expectSnackbar, typeDate, isoToday
} from './helpers.mjs'

useE2E()

const TOWN = `${NAME} Vall`
const FARM = `${NAME} Finca`
const POINT = `${NAME} Rebost`
const idOf = relation => relation?.id ?? relation
const dayOf = value => String(value || '').slice(0, 10)
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const caDate = iso => iso.split('-').reverse().join('/')

const order = id => api('GET', `orders/${id}?populate=*`)
const collectionOf = async id => idOf((await order(id)).collection_order)
const collectionOrdersOfFarm = () =>
  api('GET', `orders?_where[is_collection_order]=true&_where[contact]=${state.farm.id}&_limit=-1&_sort=id:ASC`)

// an order the way the form sends it, picked up at the farm on `day`
const farmOrder = (day, extra = {}) => ({
  owner: state.me.id,
  route: state.route.id,
  contact: state.point.id,
  pickup: state.farmPickup.id,
  collection_point: state.farm.id,
  collection_pickup_route: state.route.id,
  collection_pickup_date: day,
  estimated_delivery_date: addDays(day, 1),
  units: 1,
  kilograms: 5,
  contact_legal_form: 1,
  ...extra
})

test('setup: the logistics permissions, the farm collection point and a delivery point', async () => {
  state.route = (await api('GET', 'routes?_where[name]=E2E Ruta&_limit=1'))[0]
  state.farmPickup = (await api('GET', 'pickups?_where[name]=E2E Recollida en Finca&_limit=1'))[0]
  expect(state.route && state.farmPickup, 'the logistics fixture (logistics-fixture.sql) is loaded').toBeTruthy()

  const permissions = new Set([...(state.me.permissions || []).map(p => p.permission), 'orders', 'orders_admin'])
  await api('PUT', `users/${state.me.id}`, { permissions: [...permissions].map(permission => ({ permission })) })
  await page.evaluate(() => localStorage.clear())
  await login(page, env.E2E_USER, env.E2E_PASSWORD)
  await page.reload()

  // a town on the route: the collection point's pickup routes are the routes of its town
  state.city = await api('POST', 'cities', { data: { name: TOWN } })
  await api('POST', 'city-routes', { data: { city: state.city.id, route: state.route.id } })

  // the member ("sòcia") contact of the user, with the farm as its collection point
  ;[state.member] = await api('GET', `contacts?_where[users_permissions_user]=${state.me.id}&_sort=id:ASC&_limit=1`)
  state.member ??= await api('POST', 'contacts', { data: { name: `${NAME} sòcia`, nif: `E2ES${STAMP}`, users_permissions_user: state.me.id } })
  state.farm = await api('POST', 'contacts', { data: { name: FARM, trade_name: FARM, city: TOWN, postcode: '08470', address: 'Mas de les Proves', owner: state.me.id } })
  await api('PUT', `contacts/${state.member.id}`, { data: { collection_points: [state.farm.id] } })

  state.point = await api('POST', 'contacts', {
    data: { name: `${POINT} SCCL`, trade_name: POINT, nif: `E2EP${STAMP}`, city: TOWN, postcode: '08470', address: 'Carrer de les Proves, 2', phone: '600 000 002', time_slot_1_ini: 9, time_slot_1_end: 14, owner: state.me.id }
  })
  expect(state.farm.id && state.point.id).toBeTruthy()
})

test('a farm-pickup order from the form creates its -R', async () => {
  test.skip(!state.point, 'needs the setup')
  await visit('/comanda/0')
  await field('Sòcia').locator('select').selectOption(String(state.me.id))
  const contact = page.getByPlaceholder("Punt d'entrega")
  await contact.click()
  await contact.pressSequentially(POINT, { delay: 20 })
  await page.locator('.autocomplete .dropdown-item', { hasText: POINT }).filter({ visible: true }).first().click()
  await settle()
  await field('Número de caixes').locator('input').fill('2')
  await field('Kilograms').locator('input').fill('10')
  await button(state.farmPickup.name).click()
  await field('Punt de recollida en finca').locator('select').selectOption(String(state.farm.id))
  await settle()
  // the farm's town has one route: it is chosen, with its next day
  await expect(field('Ruta de recollida').locator('select')).toHaveValue(String(state.route.id))
  const proposed = await field('Data de recollida').locator('input').inputValue()
  expect(proposed).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  await button('Guardar').click()
  await expect(page).toHaveURL(/\/order\/[1-9]\d*/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.first = Number(page.url().match(/\/order\/(\d+)/)[1])

  const saved = await order(state.first)
  state.day = dayOf(saved.collection_pickup_date)
  expect(state.day >= isoToday(), 'the proposed pickup day is not in the past').toBe(true)
  expect(idOf(saved.collection_point)).toBe(state.farm.id)
  state.r1 = idOf(saved.collection_order)
  expect(state.r1, 'the order is in a -R').toBeTruthy()
  expect(await order(state.r1)).toMatchObject({ is_collection_order: true, status: 'pending', units: 2, kilograms: 10 })
  expect(dayOf((await order(state.r1)).collection_pickup_date)).toBe(state.day)
})

test('a second order of the same day joins the -R and adds to it', async () => {
  test.skip(!state.r1, 'needs the first order')
  state.second = (await api('POST', 'orders', { data: farmOrder(state.day, { units: 1, kilograms: 5 }) })).id
  expect(await collectionOf(state.second)).toBe(state.r1)
  expect(await order(state.r1)).toMatchObject({ status: 'pending', units: 3, kilograms: 15 })
  expect(await collectionOrdersOfFarm()).toHaveLength(1)
})

test('saving an order from the form without changes keeps it in its -R', async () => {
  test.skip(!state.r1, 'needs the first order')
  await visit(`/comanda/${state.first}`)
  await expect(field('Data de recollida').locator('input')).toHaveValue(caDate(state.day))
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  await settle()
  expect(await collectionOf(state.first)).toBe(state.r1)
  expect(await order(state.r1)).toMatchObject({ status: 'pending', units: 3, kilograms: 15 })
  expect(await collectionOrdersOfFarm()).toHaveLength(1)
})

test('the form offers no past pickup day, and refuses one typed in (issues/302)', async () => {
  test.skip(!state.r1, 'needs the first order')
  await visit(`/comanda/${state.first}`)
  const input = field('Data de recollida').locator('input')
  await typeDate(input, caDate(addDays(isoToday(), -7)))
  await expect(page.getByText('Atenció! La data de recollida ja ha passat')).toBeVisible()
  await button('Guardar').click()
  await expectSnackbar('ja ha passat')
  expect(dayOf((await order(state.first)).collection_pickup_date)).toBe(state.day)
  expect(await collectionOf(state.first)).toBe(state.r1)
})

test('the API refuses a past pickup day too, for a new order or a moved one (issues/302)', async () => {
  test.skip(!state.r1, 'needs the first order')
  const yesterday = addDays(isoToday(), -1)
  const created = await api('POST', 'orders', { data: farmOrder(yesterday, { estimated_delivery_date: addDays(isoToday(), 3) }) }, { raw: true })
  expect(created.status).toBe(400)
  expect(JSON.stringify(created.body)).toMatch(/ja ha passat/)
  const moved = await api('PUT', `orders/${state.second}`, { data: { collection_pickup_date: yesterday } }, { raw: true })
  expect(moved.status).toBe(400)
  expect(await collectionOf(state.second)).toBe(state.r1)
})

test('moving the pickup day moves the order to the -R of that day, and the old one recomputes', async () => {
  test.skip(!state.second, 'needs the second order')
  state.nextDay = addDays(state.day, 1)
  await api('PUT', `orders/${state.second}`, { data: { collection_pickup_date: state.nextDay, estimated_delivery_date: addDays(state.nextDay, 1) } })
  state.r2 = await collectionOf(state.second)
  expect(state.r2).not.toBe(state.r1)
  const r2 = await order(state.r2)
  expect(r2).toMatchObject({ is_collection_order: true, status: 'pending', units: 1, kilograms: 5 })
  expect(dayOf(r2.collection_pickup_date)).toBe(state.nextDay)
  expect(await order(state.r1)).toMatchObject({ status: 'pending', units: 2, kilograms: 10 })
})

test('a -R past pending takes no new orders: a new -R of the same day is created (issues/303)', async () => {
  test.skip(!state.r1, 'needs the first -R')
  await api('PUT', `orders/${state.r1}`, { data: { status: 'processed' } })
  state.third = (await api('POST', 'orders', { data: farmOrder(state.day, { units: 4, kilograms: 20 }) })).id
  const r3 = await collectionOf(state.third)
  expect(r3).not.toBe(state.r1)
  expect(await order(r3)).toMatchObject({ is_collection_order: true, status: 'pending', units: 4, kilograms: 20 })
  expect(dayOf((await order(r3)).collection_pickup_date)).toBe(state.day)
  // the processed one keeps what it collected
  expect(await order(state.r1)).toMatchObject({ status: 'processed', units: 2, kilograms: 10 })
  expect(await collectionOf(state.first)).toBe(state.r1)
})

test('cancelling the only order of a -R cancels the -R (issues/217)', async () => {
  test.skip(!state.r2, 'needs the moved order')
  await api('PUT', `orders/${state.second}`, { data: { status: 'cancelled' } })
  expect((await order(state.r2)).status).toBe('cancelled')
})
