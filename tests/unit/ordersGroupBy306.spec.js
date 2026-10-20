// Orders list grouping (issues/306): no grouping by default, and the choice the
// user makes is kept in localStorage on its own key.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

const vm = () => ({ ...OrdersTable.data.call({}), routeFilter: [] })

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
})
