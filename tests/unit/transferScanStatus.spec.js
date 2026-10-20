// issues/222: scanning an albarà QR on «Transferències» started and ended the
// transfer of cancelled and invoiced orders (24770, 24692). Like the deposit
// (issues/149), the scanner refuses them with a message, the order form hides
// the buttons, and the API refuses them too.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const put = vi.fn(async () => ({}))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import TransfersTable from '@/components/TransfersTable.vue'
import { canTransfer } from '@/domain/orderStatus'

const vm = action => ({
  scannerAction: action,
  $buefy: { toast: { open: vi.fn() } }
})

const order = extra => ({ id: 5, transfer: true, transfer_start_date: null, transfer_end_date: null, ...extra })

describe('transfer by QR (issues/222)', () => {
  beforeEach(() => {
    put.mockClear()
    get.mockReset()
  })

  it('moves only orders not cancelled nor invoiced', () => {
    for (const status of ['pending', 'processed', 'delivered']) expect(canTransfer({ status })).toBe(true)
    for (const status of ['invoiced', 'cancelled']) expect(canTransfer({ status })).toBe(false)
  })

  it.each([
    ['start', 'cancelled', {}, 'anul·lada'],
    ['start', 'invoiced', {}, 'facturada'],
    ['end', 'invoiced', { transfer_start_date: '2026-10-18T08:00:00Z' }, 'facturada']
  ])('refuses to %s the transfer of a %s order', async (action, status, extra, word) => {
    get.mockImplementation(async url => (url === 'users/me' ? { data: { id: 9 } } : { data: order({ status, ...extra }) }))
    const history = vi.fn()
    await TransfersTable.methods.handleScannedOrder.call(vm(action), 5, history)
    expect(put).not.toHaveBeenCalled()
    expect(history).toHaveBeenCalledWith(5, 'error', expect.stringContaining(word))
  })

  it('starts the transfer of a processed order', async () => {
    get.mockImplementation(async url => (url === 'users/me' ? { data: { id: 9 } } : { data: order({ status: 'processed' }) }))
    const history = vi.fn()
    await TransfersTable.methods.handleScannedOrder.call(vm('start'), 5, history)
    expect(put).toHaveBeenCalledWith('orders/5', expect.objectContaining({ transfer_start_user: 9 }))
    expect(history).toHaveBeenCalledWith(5, 'success', expect.any(String))
  })
})
