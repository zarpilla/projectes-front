// issues/154: the state counters of Incidències ignored the search and the
// Sòcia filter; they now count with the same filters as the list.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: vi.fn() }) }))
import IncidencesTable from '@/components/IncidencesTable.vue'

const vmFor = extra => ({
  ...IncidencesTable.methods,
  stateFilter: ['open', 'wip'],
  search: '',
  ownerFilter: null,
  isAdmin: true,
  currentUserId: 3,
  openCount: 0,
  wipCount: 0,
  closedCount: 0,
  ...extra
})

beforeEach(() => {
  get.mockReset()
  get.mockImplementation(async (url, { params }) => ({ data: { open: 1, wip: 2, closed: 3 }[params.state] }))
})

describe('Incidències state counters (issues/154)', () => {
  it('follow the search and the Sòcia filter, not the state tab', async () => {
    const vm = vmFor({ search: 'Mas', ownerFilter: 58 })
    await IncidencesTable.methods.loadStateCounts.call(vm)
    expect(get).toHaveBeenCalledTimes(3)
    for (const [url, { params }] of get.mock.calls) {
      expect(url).toBe('incidences/count')
      expect(params['order.owner']).toBe(58)
      expect(params['_where[_or][0][description_contains]']).toBe('Mas')
      expect(params.state_in).toBeUndefined()
    }
    expect(get.mock.calls.map(([, { params }]) => params.state)).toEqual(['open', 'wip', 'closed'])
    expect([vm.openCount, vm.wipCount, vm.closedCount]).toEqual([1, 2, 3])
  })

  it("a member's counters stay on her own orders", async () => {
    const vm = vmFor({ isAdmin: false })
    await IncidencesTable.methods.loadStateCounts.call(vm)
    for (const [, { params }] of get.mock.calls) expect(params['order.owner']).toBe(3)
  })
})
