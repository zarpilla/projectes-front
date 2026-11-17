// Orders list grouping (issues/306): no grouping by default, and the choice the
// user makes is kept in localStorage on its own key.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

const vm = () => ({ ...OrdersTable.data.call({}), routeFilter: [], refresh: vi.fn() })

describe('OrdersTable grouping', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to no grouping', () => {
    const state = vm()
    OrdersTable.methods.restoreGroupBy.call(state)
    expect(state.groupBy).toBe('none')
  })

  it('ignores the old value saved with the filters on every load', () => {
    localStorage.setItem('OrdersTable.filters', JSON.stringify({ groupBy: 'route' }))
    const state = vm()
    OrdersTable.methods.restoreGroupBy.call(state)
    expect(state.groupBy).toBe('none')
  })

  it('saves the chosen grouping and restores it', () => {
    const state = vm()
    state.groupBy = 'date'
    OrdersTable.methods.saveGroupBy.call(state)
    const next = vm()
    OrdersTable.methods.restoreGroupBy.call(next)
    expect(next.groupBy).toBe('date')
  })

  it('ignores an unknown saved value', () => {
    localStorage.setItem('OrdersTable.groupBy', '"x"')
    const state = vm()
    OrdersTable.methods.restoreGroupBy.call(state)
    expect(state.groupBy).toBe('none')
  })

  // issues/445: grouped, a group showed only the orders of the page (150), and
  // reversing the sort moved some orders to page 2: grouped loads them all
  it('loads every order when grouped, pages of 150 without grouping', () => {
    const perPage = (state) => OrdersTable.computed.perPageEffective.call(state)
    const state = vm()
    expect(perPage(state)).toBe(150)
    state.groupBy = 'route'
    expect(perPage(state)).toBe(1000)
    state.groupBy = 'owner'
    expect(perPage(state)).toBe(1000)
  })

  it('reloads from the first page when the grouping changes', () => {
    const state = vm()
    state.groupBy = 'route'
    OrdersTable.methods.saveGroupBy.call(state)
    expect(state.refresh).toHaveBeenCalled()
  })

  // issues/445: past 1,000 orders a grouped list still pages, and says so
  it('warns when a grouped list is still paged', () => {
    const incomplete = (state) =>
      OrdersTable.computed.groupedIncomplete.call({
        ...state,
        morePages: OrdersTable.computed.morePages.call({
          ...state,
          perPageEffective: OrdersTable.computed.perPageEffective.call(state)
        })
      })
    const state = vm()
    state.total = 24962
    expect(incomplete(state)).toBe(false) // not grouped: the pager is enough
    state.groupBy = 'route'
    expect(incomplete(state)).toBe(true)
    state.total = 693
    expect(incomplete(state)).toBe(false)
  })
})
