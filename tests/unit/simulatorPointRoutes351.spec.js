// issues/351: the logistics simulator quotes an order to a delivery point as
// the order form saves it: the point's routes (its town's less the cancelled
// ones, plus the extraordinary ones with their own slot, the main one first
// and chosen), and the point's discounts (its «Descompte recollida», and the
// multidelivery one when the server finds another order there that day).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import moment from 'moment'
import { quoteOrder, quoteRows } from '@/domain/logisticsQuote'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put: vi.fn(), delete: vi.fn() }) }))
import LogisticsSimulator from '@/views/LogisticsSimulator.vue'

const GIRONA = { id: 1, name: 'Magatzem Girona', pickup: false, city: { id: 10 } }
const rate = { less10: 8, more10: 10, from10to20: 14, from20to30: 18, from30to40: 22, from40to50: 26, from50to60: 30, additional60: 0.4, ratev2: true }
const week = { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
const TUESDAY = { id: 7, name: 'Garrotxa dimarts', active: true, ...week }
const THURSDAY = { id: 8, name: 'Garrotxa dijous', active: true, ...week }
const WEDNESDAY = { id: 9, name: 'Osona dimecres', active: true, ...week }
const OLOT = { id: 10, name: 'Olot' }
// a point in Olot (Tuesday and Thursday routes): Tuesday cancelled, Wednesday
// extraordinary with its own slot and main
const POINT = { id: 70, name: 'Cal Pep', trade_name: 'Botiga Cal Pep', city: 'Olot', pickup_discount: 10 }
const ROWS = [
  { id: 1, contact: { id: 70 }, route: { id: 7 }, cancelled: true },
  { id: 2, contact: { id: 70 }, route: { id: 9 }, extra: true, main: true, time_from: '10:00', time_to: '11:30' }
]

const mountWith = async ({ multidelivery = 0, member = { id: 5, username: 'pagesa', permissions: [{ permission: 'orders' }] } } = {}) => {
  get.mockImplementation(async (url = '') => {
    if (url === 'users/me') return { data: member }
    if (url === 'me') return { data: { orders_options: { multidelivery_discount: 20 } } }
    if (url.startsWith('pickups')) return { data: [GIRONA] }
    if (url.startsWith('delivery-types')) return { data: [{ id: 4, name: 'Normal' }] }
    if (url.startsWith('route-rates')) return { data: [{ id: 1, name: 'Magatzem', ...rate, routes: [], pickup: GIRONA }] }
    if (url.startsWith('routes')) return { data: [TUESDAY, THURSDAY, WEDNESDAY] }
    if (url.startsWith('cities')) return { data: [OLOT] }
    if (url === 'city-routes/basic') return { data: [{ id: 1, city: OLOT, route: TUESDAY }, { id: 2, city: OLOT, route: THURSDAY }] }
    if (url === 'contacts/for-orders?owned=1') return { data: [POINT] }
    if (url.startsWith('point-routes')) return { data: ROWS }
    if (url === 'users/me/default-pickup') return { data: { pickup: GIRONA } }
    return { data: [] }
  })
  post.mockImplementation(async url => (url === 'orders/check-multidelivery' ? { data: { multidelivery_discount: multidelivery } } : { data: {} }))
  const w = mount(LogisticsSimulator, {
    global: {
      plugins: [Buefy],
      mocks: { $buefy: { snackbar: { open: vi.fn() }, toast: { open: vi.fn() } } },
      stubs: { 'title-bar': true, 'routes-tabs': true, 'download-excel': true }
    }
  })
  await flushPromises()
  w.vm.kilograms = 5
  return w
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe('simulator: the routes of a delivery point (issues/351)', () => {
  it('without a point, the town routes; with it, its own: cancelled out, extraordinary in, main first and chosen', async () => {
    const w = await mountWith()
    w.vm.selectTown(OLOT)
    await flushPromises()
    expect(w.find('[data-test="route-7"]').exists()).toBe(true)
    expect(w.find('[data-test="route-9"]').exists()).toBe(false)

    w.vm.selectPoint(POINT)
    await flushPromises()
    expect(w.find('[data-test="route-7"]').exists()).toBe(false)
    expect(w.find('[data-test="route-8"]').exists()).toBe(true)
    const extra = w.find('[data-test="route-9"]')
    expect(extra.exists()).toBe(true)
    expect(extra.text()).toContain('principal')
    expect(extra.text()).toContain('extraordinària')
    expect(w.vm.routeOptions[0].route.id).toBe(9)
    expect(w.vm.routeId).toBe(9)
    // the point's own slot on the extraordinary route
    expect(w.vm.slotText).toBe("de 10 a 11:30 h")
    expect(w.find('[data-test="point-town"]').text()).toContain('Anul·lada: Garrotxa dimarts')
  })

  it("the point's pickup discount comes off the order", async () => {
    const w = await mountWith()
    w.vm.selectPoint(POINT)
    await flushPromises()
    expect(w.find('[data-test="quote-point-discount"]').text()).toMatch(/10/)
    // 8 × 0.9
    expect(w.find('[data-test="quote-total"]').text()).toMatch(/7,20/)
  })

  it('another order at the point that day: the multidelivery discount, as the server says', async () => {
    const w = await mountWith({ multidelivery: 20 })
    w.vm.selectPoint(POINT)
    await flushPromises()
    expect(post).toHaveBeenCalledWith('orders/check-multidelivery', expect.objectContaining({ contactId: 70, ownerId: 5, routeId: 9 }))
    expect(w.find('[data-test="point-multidelivery"]').exists()).toBe(true)
    expect(w.find('[data-test="quote-multidelivery"]').text()).toMatch(/20/)
    // 8 × (1 − (20 + 10) / 100)
    expect(w.find('[data-test="quote-total"]').text()).toMatch(/5,60/)
  })

  it('choosing a town drops the point', async () => {
    const w = await mountWith()
    w.vm.selectPoint(POINT)
    await flushPromises()
    w.vm.selectPoint(null)
    w.vm.selectTown(OLOT)
    await flushPromises()
    expect(w.vm.point).toBe(null)
    expect(w.find('[data-test="route-7"]').exists()).toBe(true)
    expect(w.find('[data-test="quote-point-discount"]').exists()).toBe(false)
  })
})

describe('quote with a delivery point (issues/351)', () => {
  const route = { id: 7, name: 'Garrotxa', active: true, volume_discount_number_of_orders: 2, volume_discount_price: 2 }
  const routeRates = [{ id: 1, name: 'Magatzem', ...rate, routes: [], pickup: GIRONA }]
  const date = moment().add(14, 'days').startOf('day').toDate()

  it('every discount, in the invoice order: volume €, late %, then multidelivery + point %', () => {
    const q = quoteOrder(
      { route, date, kilograms: 15, deliveryType: 4, warehouse: GIRONA, point: { id: 70, pickup_discount: 10 } },
      { routeRates, pickups: [GIRONA], ordersOptions: { multidelivery_discount: 20 }, sameDayOrders: [{ status: 'pending' }], otherOrderToPoint: true }
    )
    expect(q.volume.discount).toBe(2)
    expect(q.multidelivery.discount).toBe(20)
    expect(q.pointDiscount).toBe(10)
    expect(q.total).toBe(7) // (12 − 2) × (1 − 0.3)
    const rows = quoteRows({ route, date, kilograms: 15, warehouse: GIRONA, point: POINT }, q, { routeTag: 'principal' })
    expect(rows).toContainEqual({ concepte: "Punt d'entrega", valor: 'Botiga Cal Pep' })
    expect(rows).toContainEqual({ concepte: 'Ruta', valor: 'Garrotxa (principal)' })
    expect(rows).toContainEqual({ concepte: 'Descompte recollida del punt (%)', valor: 10 })
  })
})
