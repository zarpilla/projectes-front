// issues/144: the Comandes selection bar offered «Pendent» to members (and the
// API let it through), so a member could bulk-reset processed, delivered or
// invoiced orders to Pendent. A member only cancels her own pending orders;
// the office keeps every state.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const put = vi.fn(async () => ({}))
vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(async () => ({ data: { id: 100 } })), put, post: vi.fn() })
}))
import OrdersTable from '@/components/OrdersTable.vue'
import { bulkStatuses, canSetStatus } from '@/domain/orderStatus'

describe('bulk state changes (issues/144)', () => {
  beforeEach(() => put.mockClear())

  it('offers a member only to cancel, and the office every state', () => {
    expect(bulkStatuses(false)).toEqual(['cancelled'])
    expect(bulkStatuses(true)).toEqual(['pending', 'processed', 'delivered', 'cancelled'])
  })

  it('lets a member cancel only pending orders', () => {
    expect(canSetStatus({ status: 'pending' }, 'cancelled', false)).toBe(true)
    for (const status of ['processed', 'delivered', 'invoiced', 'cancelled']) {
      expect(canSetStatus({ status }, 'pending', false)).toBe(false)
      expect(canSetStatus({ status }, 'cancelled', false)).toBe(false)
    }
    expect(canSetStatus({ status: 'delivered' }, 'pending', true)).toBe(true)
  })

  it("the selection bar's action skips the orders a member may not change", async () => {
    const vm = {
      isStaff: false,
      newState: 'cancelled',
      checkedRows: [{ id: 1, status: 'pending' }, { id: 2, status: 'delivered' }, { id: 3, status: 'invoiced' }],
      $buefy: { snackbar: { open: vi.fn() } },
      getData: vi.fn()
    }
    await OrdersTable.methods.setBulkState.call(vm)
    expect(put).toHaveBeenCalledTimes(1)
    expect(put.mock.calls[0][0]).toBe('orders/1')
    expect(vm.$buefy.snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('2') }))
  })
})
