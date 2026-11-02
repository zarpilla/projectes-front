// issues/156: the collection date proposed by the order form (Ruta de
// recollida → Data de recollida) took the route's first weekday only (a
// Monday+Thursday route on a Tuesday gave next Monday, a Sunday route never
// got a date) and ignored the route closures. It now uses assignRouteDate,
// like the delivery date: every weekday of the route, closures skipped, the
// same cutoff.
import { describe, it, expect, afterEach, vi } from 'vitest'
import moment from 'moment'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'

afterEach(() => vi.useRealTimers())

const at = when => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(when))
}

const vmFor = (route, { closures = [], permissions = [] } = {}) => {
  const vm = {
    form: { collection_pickup_route: route.id, collection_pickup_date: null },
    collectionPickupRoutes: [route],
    routeFestives: closures,
    nextDayLimitHour: 14,
    ordersOptions: {},
    holidays: [],
    permissions,
    checkCollectionPickupDate: vi.fn(),
    routeDateOptions: OrdersForm.methods.routeDateOptions
  }
  vm.lateRulesNow = OrdersForm.computed.lateRulesNow.call(vm)
  vm.dateRulesExempt = OrdersForm.computed.dateRulesExempt.call(vm)
  return vm
}

const run = async vm => {
  await OrdersForm.methods.calculateCollectionPickupDate.call(vm)
  return vm.form.collection_pickup_date && moment(vm.form.collection_pickup_date).format('YYYY-MM-DD')
}

describe('collection date of the order form (issues/156)', () => {
  const monThu = { id: 3, monday: true, thursday: true }

  it('takes the next weekday of the route, not its first one', async () => {
    at('2026-10-13T10:00:00') // Tuesday
    expect(await run(vmFor(monThu))).toBe('2026-10-15')
  })

  it('skips the days the route is closed', async () => {
    at('2026-10-16T10:00:00') // Friday, next Monday closed
    const closures = [{ date: '2026-10-19', route: { id: 3 } }]
    expect(await run(vmFor(monThu, { closures }))).toBe('2026-10-22')
    // a closure of another route doesn't count
    expect(await run(vmFor(monThu, { closures: [{ date: '2026-10-19', route: { id: 9 } }] }))).toBe('2026-10-19')
  })

  it('finds a Sunday route', async () => {
    at('2026-10-13T10:00:00')
    expect(await run(vmFor({ id: 4, sunday: true }))).toBe('2026-10-18')
  })

  // since issues/315 tomorrow is kept past the cutoff (a late pickup), as the delivery date
  it('follows the next-day cutoff, as the delivery date', async () => {
    at('2026-10-14T13:30:00') // Wednesday, between the limit and the closing
    expect(await run(vmFor(monThu))).toBe('2026-10-15')
  })

  // issues/363: a morning pickup closes at 14 h of the working day before, as
  // the deliveries; an afternoon one («Ruta de tarda») doesn't; the office can
  it('skips a closed day for a morning pickup', async () => {
    at('2026-10-14T15:00:00') // Wednesday afternoon: Thursday is closed
    expect(await run(vmFor(monThu))).toBe('2026-10-19')
    expect(await run(vmFor({ ...monThu, afternoon: true }))).toBe('2026-10-15')
    expect(await run(vmFor(monThu, { permissions: ['orders_admin'] }))).toBe('2026-10-15')
  })

  it('leaves the date empty for a route without days', async () => {
    at('2026-10-13T10:00:00')
    expect(await run(vmFor({ id: 5 }))).toBe(null)
  })
})
