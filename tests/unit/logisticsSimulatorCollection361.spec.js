// issues/361 (2026-11-02): the simulator quotes a farm pickup as the order
// form saves it: through one of the member's collection points, with the -R
// (collection order) priced less the point's «Descompte recollida», and only
// what the order adds when a -R of that point, route and day is pending.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import moment from 'moment'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: vi.fn() }) }))
import LogisticsSimulator from '@/views/LogisticsSimulator.vue'

const GIRONA = { id: 1, name: 'Magatzem Girona', pickup: false, city: { id: 10 } }
const FARM = { id: 2, name: 'Recollida en Finca', pickup: true }
const rate = { less10: 8, more10: 10, from10to20: 14, from20to30: 18, from30to40: 22, from40to50: 26, from50to60: 30, additional60: 0.4, ratev2: true }
const ROUTE = { id: 7, name: 'Garrotxa', active: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
const PICKUP_ROUTE = { ...ROUTE, id: 8, name: 'Recollides' }
const POINT = { id: 70, name: 'Mas Pla', pickup_discount: 10 }

const mountWith = async ({ pending = [] } = {}) => {
  get.mockImplementation(async (url = '') => {
    if (url === 'users/me') return { data: { id: 5, username: 'pagesa', permissions: [{ permission: 'orders' }] } }
    if (url === 'me') return { data: { orders_options: {} } }
    if (url.startsWith('pickups')) return { data: [GIRONA, FARM] }
    if (url.startsWith('delivery-types')) return { data: [{ id: 4, name: 'Normal' }] }
    if (url.startsWith('route-rates')) return { data: [{ id: 1, name: 'Magatzem', ...rate, routes: [], pickup: GIRONA }, { id: 2, name: 'Finca', ...rate, less10: 12, routes: [], pickup: FARM }] }
    if (url.startsWith('routes')) return { data: [ROUTE, PICKUP_ROUTE] }
    if (url.startsWith('cities')) return { data: [{ id: 10, name: 'Olot' }] }
    if (url === 'city-routes/basic') return { data: [{ id: 1, city: { id: 10 }, route: ROUTE }] }
    if (url.startsWith('route-festives')) return { data: [] }
    if (url === 'users/me/default-pickup') return { data: { pickup: GIRONA } }
    if (url.startsWith('contacts/for-orders')) return { data: [{ id: 30, users_permissions_user: { id: 5 }, collection_points: [POINT] }] }
    if (url.startsWith('orders/collection-point-routes')) return { data: [PICKUP_ROUTE] }
    if (url.includes('is_collection_order')) return { data: pending }
    if (url.startsWith('orders')) return { data: [] }
    return { data: [] }
  })
  const w = mount(LogisticsSimulator, {
    global: {
      plugins: [Buefy],
      mocks: { $buefy: { snackbar: { open: vi.fn() }, toast: { open: vi.fn() } } },
      stubs: { 'title-bar': true, 'routes-tabs': true, 'download-excel': true }
    }
  })
  await flushPromises()
  w.vm.selectTown({ id: 10, name: 'Olot' })
  w.vm.kilograms = 5
  await flushPromises()
  await w.find('[data-test="farm-pickup"] input').setValue(true)
  await flushPromises()
  return w
}

beforeEach(() => get.mockReset())

describe('simulator: farm pickup with its -R (issues/361)', () => {
  it('a new -R: warehouse rate for the order, plus the -R less the pickup discount', async () => {
    const w = await mountWith()
    expect(w.find('[data-test="collection-point"]').exists()).toBe(true)
    const quote = w.find('[data-test="quote"]').text()
    expect(quote).toContain('Recollida a finca (-R)')
    expect(quote).toContain('Descompte recollida')
    expect(w.find('[data-test="collection-extra"]').text()).toMatch(/7,20/)
    expect(w.find('[data-test="quote-total"]').text()).toMatch(/15,20/)
  })

  it('a pending -R that day: only what the order adds', async () => {
    const day = () => moment().add(1, 'day').format('YYYY-MM-DD')
    const w = await mountWith({ pending: [{ id: 900, kilograms: 20, price: 14, contact_pickup_discount: 10, collection_pickup_date: day() }] })
    w.vm.pickupDate = moment(day()).toDate()
    await w.vm.loadPendingCollection()
    await flushPromises()
    expect(w.find('[data-test="collection-pending"]').exists()).toBe(true)
    expect(w.find('[data-test="collection-extra"]').text()).toMatch(/1,80/)
    expect(w.find('[data-test="quote-total"]').text()).toMatch(/9,80/)
  })
})
