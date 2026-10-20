// issues/240 (review 7, 2026-10-19): the Comandes selection bar moved an
// invoiced order (24695-R, on draft invoice 890) to «Anul·lada» with no
// warning; it stayed on its invoice, so the list and the invoice disagreed.
// The order form warns («Comanda ja processada…») and lets the office go on,
// so the bar now asks first and only changes them on confirmation.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const put = vi.fn(async () => ({}))
vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(async () => ({ data: { id: 100 } })), put, post: vi.fn() })
}))
import OrdersTable from '@/components/OrdersTable.vue'
import { leavingInvoiced } from '@/domain/orderStatus'

function officeBar (checkedRows, newState = 'cancelled') {
  const vm = {
    isStaff: true,
    isDriver: false,
    newState,
    checkedRows,
    $buefy: { snackbar: { open: vi.fn() }, dialog: { confirm: vi.fn() } },
    getData: vi.fn()
  }
  vm.setBulkState = (...args) => OrdersTable.methods.setBulkState.call(vm, ...args)
  return vm
}

describe('bulk state change of invoiced orders (issues/240)', () => {
  beforeEach(() => put.mockClear())

  it('picks the invoiced orders a change would move out of Facturada', () => {
    const rows = [{ id: 1, status: 'pending' }, { id: 2, status: 'invoiced' }]
    expect(leavingInvoiced(rows, 'cancelled')).toEqual([{ id: 2, status: 'invoiced' }])
    expect(leavingInvoiced(rows, 'invoiced')).toEqual([])
  })

  it('asks before changing an invoiced order, and changes nothing until confirmed', async () => {
    const vm = officeBar([{ id: 24695, status: 'invoiced' }, { id: 7, status: 'pending' }])
    await vm.setBulkState({ type: 'click' })
    expect(put).not.toHaveBeenCalled()
    expect(vm.$buefy.dialog.confirm).toHaveBeenCalledTimes(1)
    const dialog = vm.$buefy.dialog.confirm.mock.calls[0][0]
    expect(dialog.message).toContain('#24695')
    expect(dialog.message).toContain('ja està facturada')
    expect(dialog.title).toBe('Comanda facturada')

    await dialog.onConfirm()
    expect(put.mock.calls.map(c => c[0])).toEqual(['orders/24695', 'orders/7'])
  })

  it('does not ask when none of them is invoiced', async () => {
    const vm = officeBar([{ id: 7, status: 'pending' }, { id: 8, status: 'delivered' }])
    await vm.setBulkState({ type: 'click' })
    expect(vm.$buefy.dialog.confirm).not.toHaveBeenCalled()
    expect(put).toHaveBeenCalledTimes(2)
  })
})
