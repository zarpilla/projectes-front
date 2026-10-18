// issues/149: scanning an albarà QR on «Dipòsits» deposited any order, also
// delivered, invoiced or cancelled ones. The scanner now refuses them with a
// message (and the API refuses them too).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const put = vi.fn(async () => ({}))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import DepositsTable from '@/components/DepositsTable.vue'
import { canDeposit } from '@/domain/orderStatus'

const vm = () => ({
  isAdmin: true,
  currentUserId: 9,
  statusFilter: 'pending',
  $buefy: { toast: { open: vi.fn() } }
})

describe('deposit by QR (issues/149)', () => {
  beforeEach(() => { get.mockReset(); put.mockClear() })

  it('deposits only orders still on their way', () => {
    expect(canDeposit({ status: 'pending' })).toBe(true)
    expect(canDeposit({ status: 'processed' })).toBe(true)
    for (const status of ['delivered', 'invoiced', 'cancelled']) expect(canDeposit({ status })).toBe(false)
  })

  it.each([['delivered', 'lliurada'], ['invoiced', 'facturada'], ['cancelled', 'anul·lada']])(
    'refuses a %s order with a message',
    async (status, word) => {
      get.mockResolvedValue({ data: { id: 5, status, deposit_date: null, owner: { id: 9 } } })
      const history = vi.fn()
      await DepositsTable.methods.handleScannedOrder.call(vm(), 5, history)
      expect(put).not.toHaveBeenCalled()
      expect(history).toHaveBeenCalledWith(5, 'error', expect.stringContaining(word))
    }
  )

  it('deposits a pending order', async () => {
    get.mockResolvedValue({ data: { id: 6, status: 'pending', deposit_date: null, owner: { id: 9 } } })
    const history = vi.fn()
    await DepositsTable.methods.handleScannedOrder.call(vm(), 6, history)
    expect(put).toHaveBeenCalledWith('orders/6', expect.objectContaining({ deposit_user: 9 }))
    expect(history).toHaveBeenCalledWith(6, 'success', expect.any(String))
  })
})
