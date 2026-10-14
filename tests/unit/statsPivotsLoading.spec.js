// issues/043: #/orders-stats and #/incidences-stats hid their loading state as soon
// as the years arrived, before the months, so the pivot mounted with month = null
// and its getData() threw "Cannot read properties of null (reading 'id')" on every
// visit. The pivot must only show once both filters are set, and must not query
// without them.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import StatsOrders from '@/views/StatsOrders.vue'
import StatsIncidences from '@/views/StatsIncidences.vue'
import OrdersPivot from '@/components/OrdersPivot.vue'
import IncidencesPivot from '@/components/IncidencesPivot.vue'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe.each([['StatsOrders', StatsOrders], ['StatsIncidences', StatsIncidences]])('%s loading', (_, view) => {
  it('keeps loading until the months are there too', async () => {
    let answerMonths
    api.get.mockImplementation(url => url.startsWith('years')
      ? Promise.resolve({ data: [{ id: 1, year: 2026 }] })
      : new Promise(resolve => { answerMonths = resolve }))
    const vm = { ...view.data(), isLoading: true }

    view.methods.getData.call(vm)
    await flush()
    expect(vm.filters.year).toEqual({ id: 1, year: 2026 })
    expect(vm.isLoading).toBe(true) // the pivot (v-if="!isLoading") would mount with month = null

    answerMonths({ data: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, month: i + 1 })) })
    await flush()
    expect(vm.filters.month).toBeTruthy()
    expect(vm.isLoading).toBe(false)
  })
})

describe.each([['OrdersPivot', OrdersPivot], ['IncidencesPivot', IncidencesPivot]])('%s without filters', (_, pivot) => {
  beforeEach(() => api.get.mockReset())

  it.each([
    ['no month', { year: { id: 0 }, month: null }],
    ['no year', { year: null, month: { id: 0 } }]
  ])('does not query with %s', async (__, props) => {
    const vm = { ...pivot.data.call({}), ...props, initializePivotWithViews: vi.fn() }
    await expect(pivot.methods.getData.call(vm)).resolves.toBeUndefined()
    expect(api.get).not.toHaveBeenCalled()
  })
})
