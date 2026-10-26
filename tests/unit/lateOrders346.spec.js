// issues/346 (2026-10-26, La Diligència): the pickups of the «(TARDA)» routes
// entered the day before were marked late (the afternoon was told by a time
// slot no route had), a re-saved order was judged a day early (the form sent
// its date as a Date, the day before in UTC), and the late orders spoke of
// «express» when it is a surcharge for breaking the rules.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { routeToForm as routeForm, routePayload } from '@/domain/routeForm'

const put = vi.fn(async () => ({ data: {} }))
const post = vi.fn(async () => ({ data: { id: 9 } }))
const get = vi.fn(async () => ({ data: { id: 7 } }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post }) }))
import OrdersForm from '@/components/OrdersForm.vue'

const confirm = vi.fn()
const vmFor = (extra = {}) => ({
  dateRulesExempt: false,
  storedDates: null,
  ordersOptions: { next_day_limit_hour: 13 },
  $buefy: { dialog: { confirm: opts => { confirm(opts); opts.onConfirm() } } },
  ...extra
})

afterEach(() => {
  vi.useRealTimers()
  confirm.mockClear()
})

describe('«Ruta de tarda» (issues/346)', () => {
  it('is kept by the route form', () => {
    expect(routeForm({ id: 25, name: 'DT - (TARDA) EMPORDÀ', afternoon: true }).afternoon).toBe(true)
    expect(routePayload({ ...routeForm({ id: 25, name: 'DT - (TARDA) EMPORDÀ' }), afternoon: true }).afternoon).toBe(true)
    expect(routePayload(routeForm({ id: 11, name: 'DT - BAIX MONTSENY' })).afternoon).toBe(false)
  })

  it('a pickup on it entered the day before after 13 h is not warned; on another route it is', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T16:13:00'))
    const form = { collection_point: 8, collection_pickup_route: 25, collection_pickup_date: '2026-10-27', estimated_delivery_date: '2026-10-28' }
    const routes = [{ id: 25, afternoon: true, time_from: null }, { id: 11, afternoon: false, time_from: '15:00:00.000' }]
    await OrdersForm.methods.confirmLate.call(vmFor({ form, collectionPickupRoutes: routes }))
    expect(confirm).not.toHaveBeenCalled()

    // a slot from 15 h no longer makes a route an afternoon one
    await OrdersForm.methods.confirmLate.call(vmFor({ form: { ...form, collection_pickup_route: 11 }, collectionPickupRoutes: routes }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0].title).toBe('Recollida fora de temps')
  })
})

describe('the words (issues/346)', () => {
  it('no «express» on the order screens nor in the settings', () => {
    for (const file of ['components/OrdersForm.vue', 'components/OrdersTable.vue', 'components/MeForm.vue', 'service/assignRouteRate.js']) {
      const source = readFileSync(resolve(__dirname, '../../src', file), 'utf8')
      // the signal keeps its key «express»: saved list filters use it
      expect(source.replace(/key: "express"/g, ""), file).not.toMatch(/express/i)
    }
  })
})

describe('the date the form saves (issues/346)', () => {
  it('sends the delivery day as YYYY-MM-DD, not a Date the server reads in UTC', () => {
    const source = readFileSync(resolve(__dirname, '../../src/components/OrdersForm.vue'), 'utf8')
    const formatted = source.match(/orderData\.estimated_delivery_date = moment\(\s*orderData\.estimated_delivery_date\s*\)\.format\("YYYY-MM-DD"\)/g) || []
    // on update and on create
    expect(formatted).toHaveLength(2)
  })
})
