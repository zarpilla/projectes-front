// issues/319 (2026-10-23): the orders list counted its total and each status
// tab with `orders/count`, a one-row read the backend answered with
// populate=* (seven per load, median 1.5 s on diligencia, up to 12 s).
// The total reads `orders/table/count` and the tabs one
// `orders/table/status-counts`, with the same filters as before (issues/324).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

beforeEach(() => {
  get.mockReset()
})

describe('OrdersTable counts (issues/319)', () => {
  it('gets every status tab from one orders/table/status-counts request', async () => {
    get.mockResolvedValue({ data: { all: 10, pending: 3, processed: 2, delivered: 4, invoiced: 1, cancelled: 0 } })
    const vm = { userFilter: '&_where[owner]=65', statusCounts: {} }
    await OrdersTable.methods.loadStatusCounts.call(vm, ['_where[route.id]=12'])

    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('orders/table/status-counts?&_where[owner]=65&_where[route.id]=12')
    expect(vm.statusCounts).toEqual({ all: 10, pending: 3, processed: 2, delivered: 4, invoiced: 1, cancelled: 0 })
  })

  it('leaves the tabs without a number when the request fails', async () => {
    get.mockRejectedValue(new Error('500'))
    const vm = { userFilter: '', statusCounts: {} }
    await OrdersTable.methods.loadStatusCounts.call(vm, [])
    expect(vm.statusCounts).toEqual({ all: null, pending: null, processed: null, delivered: null, invoiced: null, cancelled: null })
  })

  it('no screen counts orders with orders/count any more', () => {
    const sources = import.meta.glob(['/src/**/*.vue', '/src/**/*.js'], { query: '?raw', import: 'default', eager: true })
    const offenders = Object.keys(sources).filter(f => /[`'"]\/?orders\/count/.test(sources[f]))
    expect(offenders).toEqual([])
  })
})
