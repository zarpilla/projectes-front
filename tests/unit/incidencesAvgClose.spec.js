// issues/275: «Temps mitjà de tancament» was loaded once on mount: it ignored
// the Sòcia filter and the search, and stayed the same after closing an
// incidence. It now follows the filters of the list (not its state tab) and
// reloads with the list.
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
  page: 1,
  perPage: 50,
  sortField: 'id',
  sortOrder: 'desc',
  avgCloseDays: null,
  $buefy: { toast: { open: vi.fn() } },
  ...extra
})

const closed = [
  { id: 1, created_at: '2026-10-01T10:00:00Z', closed_date: '2026-10-03T10:00:00Z' },
  { id: 2, created_at: '2026-10-01T10:00:00Z', closed_date: '2026-10-05T10:00:00Z' }
]

beforeEach(() => {
  get.mockReset()
  get.mockImplementation(async (url, { params } = {}) => {
    if (url === 'incidences' && params.closed_date_gte) return { data: closed }
    if (url === 'incidences/count') return { data: 0 }
    return { data: [] }
  })
})

const avgCall = () => get.mock.calls.find(([url, opts]) => url === 'incidences' && opts.params.closed_date_gte)

describe('Incidències average close time (issues/275)', () => {
  it('follows the search and the Sòcia filter, not the state tab', async () => {
    const vm = vmFor({ search: 'Mas', ownerFilter: 58 })
    await IncidencesTable.methods.loadAvgClose.call(vm)
    const [, { params }] = avgCall()
    expect(params['order.owner']).toBe(58)
    expect(params['_where[_or][0][description_contains]']).toBe('Mas')
    expect(params.state).toBe('closed')
    expect(params.state_in).toBeUndefined()
    expect(vm.avgCloseDays).toBe(3)
  })

  it("a member's stays on her own orders", async () => {
    const vm = vmFor({ isAdmin: false, ownerFilter: 58 })
    await IncidencesTable.methods.loadAvgClose.call(vm)
    expect(avgCall()[1].params['order.owner']).toBe(3)
  })

  it('reloads with the list (a close, a filter change)', async () => {
    const vm = vmFor()
    await IncidencesTable.methods.loadData.call(vm)
    expect(avgCall()).toBeTruthy()
    expect(vm.avgCloseDays).toBe(3)
  })
})
