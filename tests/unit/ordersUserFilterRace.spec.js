// A search typed (or restored by the browser) while Comandes is still loading
// asked orders/totals and status-counts with «?undefined»: the member's owner
// filter was not known yet, and the backend answered 500 (Loki, 2026-10-27).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

describe('orders list before the user is known', () => {
  beforeEach(() => get.mockReset())

  it('starts with no owner filter decided', () => {
    const data = OrdersTable.data.call({ addressFormatted: OrdersTable.methods.addressFormatted })
    expect(data.userFilter).toBeNull()
  })

  it('a refresh during the first load sends nothing', async () => {
    const vm = { statusFilter: [], page: 1, userFilter: null }
    await OrdersTable.methods.setStatusFilter.call(vm, { ctrlKey: false, metaKey: false })
    expect(get).not.toHaveBeenCalled()
  })
})
