// Logistics beyond the basic order (orders.spec.mjs has that): the time slot of a
// town on its route ("Franges", issues/314), closing a route on a day ("Rutes i
// dies") and what it does to a new order's date, a late order of a member
// (issues/315: warning, «Comanda express», surcharge, the office takes it off),
// "Dipòsits", "Transferències" (an order picked up in a town its route doesn't
// go through), and an incidence handled in "Incidències" and counted in its
// report ("Informe d'incidències").
//
// The route, the warehouses (one in a town no route goes through) come from
// logistics-fixture.sql. The town, the delivery points and a member user (orders
// permission only: the office and the staff are exempt from the date rules) are
// created here, through the API.

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, env, login, openSession, onCleanup, NAME, STAMP, visit, settle, field, button,
  expectSnackbar, confirmDialog, isoToday, parseNumber
} from './helpers.mjs'

useE2E()

const TOWN = `${NAME} Poble`
const POINT = `${NAME} Colmado`
const MEMBER_POINT = `${NAME} Fleca`
const MEMBER = { username: `e2e-${STAMP}-soc`, email: `e2e-${STAMP}-soc@exemple.coop`, password: `E2e-${STAMP}!s` }
const idOf = relation => relation?.id ?? relation
const dayOf = value => String(value || '').slice(0, 10)
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const order = id => api('GET', `orders/${id}`)

// an order the way the form sends it, for the delivery point, on `day`
const newOrder = (extra = {}) => api('POST', 'orders', {
  data: {
    owner: state.me.id,
    route: state.route.id,
    contact: state.point.id,
    pickup: state.pickup.id,
    delivery_type: state.deliveryType.id,
    estimated_delivery_date: addDays(isoToday(), 3),
    units: 1,
    kilograms: 4,
    contact_legal_form: 1,
    contact_trade_name: POINT,
    contact_city: TOWN,
    ...extra
  }
})

// field() of helpers.mjs, on another page (the member's session)
const fieldOn = (p, label) => p.locator('.field').filter({
  has: p.locator(':scope > .label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) })
}).filter({ visible: true }).first()
const buttonOn = (p, text) => p.locator('button').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) }).filter({ visible: true }).first()

// picks the delivery point in a new order's form and waits for its route
async function pickPoint (p, name) {
  const contact = p.getByPlaceholder("Punt d'entrega")
  await contact.click()
  await contact.pressSequentially(name, { delay: 20 })
  await p.locator('.autocomplete .dropdown-item', { hasText: name }).filter({ visible: true }).first().click()
  await p.waitForLoadState('networkidle').catch(() => {})
  await expect(p.locator('button.pill.is-warning', { hasText: state.route.name })).toBeVisible()
}

test('setup: the logistics permissions, a town on the route, delivery points and a member', async () => {
  const one = async (type, name) => (await api('GET', `${type}?_where[name]=${encodeURIComponent(name)}&_limit=1`))[0]
  state.route = await one('routes', 'E2E Ruta')
  state.pickup = await one('pickups', 'E2E Magatzem')
  state.remote = await one('pickups', 'E2E Magatzem Remot')
  state.deliveryType = await one('delivery-types', 'E2E Normal')
  expect(state.route && state.pickup && state.remote && state.deliveryType, 'the logistics fixture (logistics-fixture.sql) is loaded').toBeTruthy()

  const permissions = new Set([...(state.me.permissions || []).map(p => p.permission), 'orders', 'orders_admin'])
  await api('PUT', `users/${state.me.id}`, { permissions: [...permissions].map(permission => ({ permission })) })
  // the app keeps the user and its permissions from the login, and caches users/me
  await page.evaluate(() => localStorage.clear())
  await login(page, env.E2E_USER, env.E2E_PASSWORD)
  await page.reload()

  state.city = await api('POST', 'cities', { data: { name: TOWN } })
  state.link = await api('POST', 'city-routes', { data: { city: state.city.id, route: state.route.id } })
  const point = (name, owner, nif) => api('POST', 'contacts', {
    data: { name: `${name} SCCL`, trade_name: name, nif, city: TOWN, postcode: '08500', address: 'Carrer de les Proves, 3', phone: '600 000 003', time_slot_1_ini: 9, time_slot_1_end: 14, owner }
  })
  state.point = await point(POINT, state.me.id, `E2EL${STAMP}`)

  // a member: only the orders permission, so the date rules apply to her
  state.member = await api('POST', 'users', {
    ...MEMBER, confirmed: true, blocked: false, role: idOf(state.me.role) || 1, permissions: [{ permission: 'orders' }]
  })
  expect(state.member.id).toBeTruthy()
  state.memberPoint = await point(MEMBER_POINT, state.member.id, `E2EM${STAMP}`)
})

test('"Franges": a town\'s own time slot on its route, shown in the order form (issues/314)', async () => {
  test.skip(!state.link, 'needs the setup')
  await visit('/poblacions-rutes')
  const route = page.locator('.a-box, section, article').filter({ has: page.locator('b', { hasText: new RegExp(`^\\s*${state.route.name}\\s*$`) }) })
    .filter({ has: page.locator('button', { hasText: 'Franges' }) }).last()
  await button('Franges', route).click()
  const row = route.locator('tr', { hasText: TOWN })
  await expect(row).toContainText('Per definir')
  await row.getByLabel(`Franja de ${TOWN} a ${state.route.name}: de`).fill('16:00')
  await row.getByLabel(`Franja de ${TOWN} a ${state.route.name}: a`).fill('18:30')
  // saved when the focus leaves the pair
  await page.getByPlaceholder('Població', { exact: true }).click()
  await expectSnackbar('Franja desada')
  await expect(row).toContainText('de 16 a 18:30 h')
  let link = await api('GET', `city-routes/${state.link.id}`)
  expect([link.time_from, link.time_to].map(t => String(t).slice(0, 5))).toEqual(['16:00', '18:30'])

  // the order form says when the route passes by the point's town
  await visit('/comanda/0')
  await field('Sòcia').locator('select').selectOption(String(state.me.id))
  await pickPoint(page, POINT)
  await expect(page.locator('[data-test="route-slot"]')).toContainText('Hi passem de 16 a 18:30 h')

  // back to the route's (none)
  await visit('/poblacions-rutes')
  await button('Franges', route).click()
  await button('Torna a la de la ruta', row).click()
  await expectSnackbar('Franja desada')
  link = await api('GET', `city-routes/${state.link.id}`)
  expect(link.time_from).toBeFalsy()
})

test('"Rutes i dies": a route closed tomorrow moves a new order to the day after', async () => {
  test.skip(!state.point, 'needs the setup')
  const tomorrow = addDays(isoToday(), 1)
  const ddmm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7)
  const closures = async () => (await api('GET', `route-festives?_where[date]=${tomorrow}&_limit=-1`))
    .filter(f => !f.route || idOf(f.route) === state.route.id)
  // never leave the route closed for the specs that follow
  onCleanup(async () => { for (const f of await closures()) await api('DELETE', `route-festives/${f.id}`) })
  expect(await closures(), 'the route is open tomorrow').toEqual([])

  await visit('/rutes-dies')
  const routeRow = page.locator('tr').filter({ has: page.locator('th.rd-route b', { hasText: new RegExp(`^\\s*${state.route.name}\\s*$`) }) }).first()
  const cell = routeRow.locator('.rd-cell', { hasText: ddmm(tomorrow) }).first()
  await expect(cell).toContainText('Oberta')
  await cell.click()
  await expect(cell).toContainText('Tancada')
  expect(await closures()).toHaveLength(1)

  // a new order skips the closed day
  await visit('/comanda/0')
  await field('Sòcia').locator('select').selectOption(String(state.me.id))
  await pickPoint(page, POINT)
  await field('Número de caixes').locator('input').fill('2')
  await field('Kilograms').locator('input').fill('10')
  await button(state.pickup.name).click()
  await button('Guardar').click()
  await expect(page).toHaveURL(/\/order\/[1-9]\d*/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.orderId = Number(page.url().match(/\/order\/(\d+)/)[1])
  const saved = await order(state.orderId)
  expect(dayOf(saved.estimated_delivery_date)).toBe(addDays(tomorrow, 1))

  // opening it again removes the closure
  await visit('/rutes-dies')
  await expect(cell).toContainText('Tancada')
  await cell.click()
  await expect(cell).toContainText('Oberta')
  expect(await closures()).toEqual([])
})

test('a member\'s late order: warned, «Comanda express» with the surcharge, the office takes it off (issues/315)', async ({ browser }) => {
  test.skip(!state.memberPoint, 'needs the member')
  // past "Hora límit per a l'endemà" whatever the time of the run: 0 h
  const me = await api('GET', 'me?populate=orders_options')
  const options = me.orders_options || {}
  const restore = () => api('PUT', 'me', { data: { orders_options: { ...options, id: undefined } } })
  onCleanup(restore)
  await api('PUT', 'me', { data: { orders_options: { ...options, id: undefined, next_day_limit_hour: 0, late_surcharge: 25 } } })

  const member = await openSession(browser, MEMBER.email, MEMBER.password)
  try {
    await member.goto('#/comanda/0')
    await member.waitForLoadState('networkidle').catch(() => {})
    const owner = fieldOn(member, 'Sòcia').locator('select')
    if (await owner.isEnabled()) await owner.selectOption(String(state.member.id))
    await pickPoint(member, MEMBER_POINT)
    await fieldOn(member, 'Número de caixes').locator('input').fill('1')
    await fieldOn(member, 'Kilograms').locator('input').fill('5')
    await buttonOn(member, state.pickup.name).click()
    // tomorrow is kept, and she is warned before saving
    await member.locator('.savebar button', { hasText: /^\s*Guardar\s*$/ }).click()
    const dialog = member.locator('.dialog.modal.is-active', { hasText: 'Comanda fora de temps' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('recàrrec del 25%')
    // "Torna" goes back without saving
    await dialog.locator('button', { hasText: 'Torna' }).click()
    await expect(dialog).toBeHidden()
    expect(member.url()).toMatch(/\/order\/0/)
    await member.locator('.savebar button', { hasText: /^\s*Guardar\s*$/ }).click()
    await member.locator('.dialog.modal.is-active button', { hasText: 'Desa la comanda' }).click()
    await expect(member).toHaveURL(/\/order\/[1-9]\d*/, { timeout: 20_000 })
    state.lateId = Number(member.url().match(/\/order\/(\d+)/)[1])
  } finally {
    await member.context().close()
  }
  await restore()

  let saved = await order(state.lateId)
  expect(dayOf(saved.estimated_delivery_date)).toBe(addDays(isoToday(), 1))
  expect([saved.late_order, Number(saved.late_surcharge)]).toEqual([true, 25])
  expect(idOf(saved.owner)).toBe(state.member.id)

  // the office sees it as express, with the surcharge in the price
  await visit(`/comanda/${state.lateId}`)
  await expect(page.locator('[data-test="late-order-tag"]')).toHaveText(/Comanda express/i)
  await expect(page.locator('[data-test="late-notice"]')).toContainText('recàrrec del 25')
  await expect(page.locator('.facts').filter({ hasText: 'Recàrrec express' })).toContainText('+25')
  // and takes it off: "Recàrrec per incidència" unchecked
  await page.locator('[data-test="late-order-switch"]').click()
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  saved = await order(state.lateId)
  expect([saved.late_order, Number(saved.late_surcharge)]).toEqual([false, 0])
})

test('"Dipòsits": the pending order is deposited at its warehouse, and undone', async () => {
  test.skip(!state.orderId, 'needs the order')
  await visit('/diposits')
  // the warehouse's chip (its alias): only the orders left there
  await page.locator('.chip-toggle', { hasText: new RegExp(`^\\s*${state.pickup.alias}\\s*$`) }).click()
  await settle()
  const pendingTab = page.locator('.segmented button', { hasText: 'Pendents' })
  const todayTab = page.locator('.segmented button', { hasText: 'Dipositades avui' })
  const todayBefore = parseNumber(await todayTab.locator('.count').innerText())
  const row = page.locator('table tbody tr', { hasText: `#${String(state.orderId).padStart(4, '0')}` }).first()
  await expect(row).toContainText(POINT)
  await expect(row).toContainText('Pendent')
  await button('Dipositar', row).click()
  await confirmDialog('marcar aquesta comanda com a dipositada')
  await settle()
  await expect(row).toBeHidden()
  let saved = await order(state.orderId)
  expect(saved.deposit_date).toBeTruthy()
  expect(idOf(saved.deposit_user)).toBe(state.me.id)
  expect(saved.status).toBe('pending')

  await todayTab.click()
  await settle()
  await expect(todayTab.locator('.count')).toHaveText(String(todayBefore + 1))
  await expect(row).toContainText('Dipositada')
  await button('Desfés', row).click()
  await confirmDialog('desfer el dipòsit')
  await settle()
  await expect(row).toBeHidden()
  saved = await order(state.orderId)
  expect(saved.deposit_date).toBeFalsy()
  await pendingTab.click()
  await settle()
  await expect(row).toBeVisible()
})

test('"Transferències": an order picked up in a town off its route is transferred', async () => {
  test.skip(!state.point, 'needs the setup')
  // the remote warehouse is in a town the route doesn't go through
  const created = await newOrder({ pickup: state.remote.id })
  state.transferId = created.id
  let saved = await api('GET', `orders/${state.transferId}?populate=*`)
  expect(saved.transfer, 'the order needs a transfer').toBe(true)
  expect(idOf(saved.transfer_pickup_origin)).toBe(state.remote.id)

  await visit('/transferencies')
  const label = `#${String(state.transferId).padStart(4, '0')}`
  const row = page.locator('table tbody tr', { hasText: label }).first()
  const tab = text => page.locator('.segmented button', { hasText: text })
  // the origin's chip
  await page.locator('.chip-toggle', { hasText: new RegExp(`^\\s*${state.remote.alias}\\s*$`) }).click()
  await settle()
  await expect(row).toContainText(state.remote.name)
  await expect(row).toContainText('Pendent')
  await button('Iniciar', row).click()
  await confirmDialog('iniciar aquesta transferència')
  await settle()
  await expect(row).toBeHidden()
  saved = await order(state.transferId)
  expect(saved.transfer_start_date).toBeTruthy()
  expect(idOf(saved.transfer_start_user)).toBe(state.me.id)

  await tab('En procés').click()
  await settle()
  await expect(row).toContainText('En procés')
  await button('Finalitzar', row).click()
  await confirmDialog('finalitzar aquesta transferència')
  await settle()
  saved = await order(state.transferId)
  expect(saved.transfer_end_date).toBeTruthy()
  expect(idOf(saved.transfer_end_user)).toBe(state.me.id)

  await tab('Completades').click()
  await settle()
  await expect(row).toContainText('Completada')
  // undoing the end leaves it in progress
  await button('Desfés', row).click()
  await confirmDialog('fi de transferència')
  await settle()
  saved = await order(state.transferId)
  expect(saved.transfer_end_date).toBeFalsy()
  expect(saved.transfer_start_date).toBeTruthy()
})

// the "Incidències" figure of the report, for this year and month
async function reportedIncidences () {
  await visit('/estadistiques-incidencies')
  const kpi = page.locator('.doc-kpi', { has: page.locator('span', { hasText: /^\s*Incidències\s*$/ }) }).first()
  await expect(kpi).toBeVisible({ timeout: 30_000 })
  // it opens on the latest year, not the current one (see the KNOWN BUG below)
  await page.getByRole('combobox', { name: 'Any' }).selectOption({ label: String(new Date().getFullYear()) })
  await settle()
  return parseNumber(await kpi.locator('b').innerText())
}

test('"Incidències": an answer, in progress, closed and reopened', async () => {
  test.skip(!state.orderId, 'needs the order')
  state.reportedBefore = await reportedIncidences()
  const text = `${NAME} falta una caixa`
  const created = await api('POST', 'incidences', { data: { order: state.orderId, description: text, state: 'open' } })
  state.incidenceId = created.id

  await visit('/incidencies')
  const row = page.locator('tr.inc-row', { hasText: text })
  await expect(row).toContainText('Oberta')
  await row.click()
  const detail = page.locator('.inc-detail')
  await expect(detail).toContainText(`Incidència #${state.incidenceId}`)
  await expect(detail).toContainText(POINT)

  await detail.getByPlaceholder('Escriu una resposta…').fill(`${NAME} la portem demà`)
  await button('Envia', detail).click()
  await expect(detail.locator('.conversation')).toContainText(`${NAME} la portem demà`)

  await button('Marca en procés', detail).click()
  await confirmDialog('en procés')
  await expect(detail.locator('.box-head .tag')).toHaveText('En procés')
  let saved = await api('GET', `incidences/${state.incidenceId}`)
  expect(saved.state).toBe('wip')
  expect(saved.incidence_response.map(r => r.text)).toEqual([`${NAME} la portem demà`])

  await button('Tanca', detail).click()
  await confirmDialog('tancar aquesta incidència')
  await expect(detail).toContainText('Aquesta incidència està tancada')
  saved = await api('GET', `incidences/${state.incidenceId}?populate=*`)
  expect(saved.state).toBe('closed')
  expect(saved.closed_date).toBeTruthy()
  expect(idOf(saved.closed_user)).toBe(state.me.id)
  // out of "Per resoldre", in "Tancades"
  await expect(row).toBeHidden()
  await page.locator('.segmented button', { hasText: 'Tancades' }).click()
  await settle()
  await expect(row).toContainText('Tancada')

  // the staff reopen it, and who closed it is cleared (issues/249)
  await row.click()
  await button('Reobre', detail).click()
  await confirmDialog('reobrir aquesta incidència')
  await settle()
  saved = await api('GET', `incidences/${state.incidenceId}?populate=*`)
  expect(saved.state).toBe('open')
  expect(saved.closed_user ?? null).toBeNull()
})

// issues/335: «Informe d'incidències» (and «Informe de comandes») opened on the
// newest year of `years` (2027 since addOfficialFestives2027, issues/310)
// instead of the current one.
test('"Informe d\'incidències" opens on the current year and month', async () => {
  const years = await api('GET', 'years?_limit=-1')
  test.skip(!years.some(y => Number(y.year) > new Date().getFullYear()), 'no year after the current one: the bug doesn\'t show')
  await visit('/estadistiques-incidencies')
  await expect(page.getByRole('combobox', { name: 'Mes' })).toBeVisible({ timeout: 30_000 })
  const selected = name => page.getByRole('combobox', { name }).evaluate(s => s.options[s.selectedIndex].text.trim())
  expect([await selected('Any'), await selected('Mes')]).toEqual([
    String(new Date().getFullYear()),
    new Date().toLocaleDateString('ca-ES', { month: 'long', timeZone: 'Europe/Madrid' }).replace(/^./, c => c.toUpperCase())
  ])
})

test('"Informe d\'incidències" counts the new incidence', async () => {
  test.skip(state.reportedBefore === undefined || !state.incidenceId, 'needs the incidence')
  expect(await reportedIncidences()).toBe(state.reportedBefore + 1)
})
