// issues/193 (redesign review 4, 2026-10-19): a driver ticked an invoiced order
// in Comandes and applied «Processada»: the API answered 403 (right), but the
// unhandled error left the loading overlay on, said nothing and skipped the
// rest of the selection. The order form also offered her «Anul·la la comanda»
// on invoiced orders and showed her the member's «contact La Diligència» text.
// issues/191: the point form let her change the pickup discount and the owner.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const put = vi.fn(async () => ({}))
vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(async () => ({ data: { id: 300 } })), put, post: vi.fn() })
}))
import OrdersTable from '@/components/OrdersTable.vue'
import { canSetStatus } from '@/domain/orderStatus'
import { canCancelOrder, processedOrderNotice } from '@/domain/orderPermissions'
import { driverLocksDiscount, driverLocksOwner } from '@/domain/contactAccess'

const DRIVER = ['orders_delivery', 'hours']
const OFFICE = ['orders_admin']
const MEMBER = ['orders']

describe("a driver's order actions (issues/193)", () => {
  beforeEach(() => put.mockReset())

  it('changes the state of any order but never to or from Facturada', () => {
    const driver = { driver: true }
    expect(canSetStatus({ status: 'delivered' }, 'processed', true, driver)).toBe(true)
    expect(canSetStatus({ status: 'pending' }, 'cancelled', true, driver)).toBe(true)
    expect(canSetStatus({ status: 'invoiced' }, 'processed', true, driver)).toBe(false)
    expect(canSetStatus({ status: 'delivered' }, 'invoiced', true, driver)).toBe(false)
    expect(canSetStatus({ status: 'invoiced' }, 'invoiced', true, driver)).toBe(true)
    // the office keeps every state
    expect(canSetStatus({ status: 'invoiced' }, 'processed', true)).toBe(true)
  })

  it('does not offer her to cancel an invoiced order', () => {
    expect(canCancelOrder({ id: 1, status: 'invoiced' }, DRIVER)).toBe(false)
    expect(canCancelOrder({ id: 1, status: 'processed' }, DRIVER)).toBe(true)
    expect(canCancelOrder({ id: 1, status: 'invoiced' }, OFFICE)).toBe(true)
    expect(canCancelOrder({ id: 1, status: 'pending' }, MEMBER)).toBe(true)
    expect(canCancelOrder({ id: 1, status: 'processed' }, MEMBER)).toBe(false)
    expect(canCancelOrder({ id: 1, status: 'cancelled' }, OFFICE)).toBe(false)
    expect(canCancelOrder({ status: 'pending' }, MEMBER)).toBe(false)
  })

  it("gives the staff a staff banner on processed orders, not the member's", () => {
    const order = { id: 1, status: 'processed' }
    expect(processedOrderNotice(order, DRIVER)).not.toMatch(/Diligència/)
    expect(processedOrderNotice(order, DRIVER)).toMatch(/moviments/)
    expect(processedOrderNotice(order, MEMBER)).toMatch(/Diligència/)
    expect(processedOrderNotice(order, OFFICE)).toMatch(/Atenció amb els canvis/)
  })

  function listVm (rows, newState = 'processed') {
    return {
      isStaff: true,
      isDriver: true,
      newState,
      importing: false,
      checkedRows: rows,
      $buefy: { snackbar: { open: vi.fn() } },
      getData: vi.fn()
    }
  }

  it('skips the invoiced orders, and reports a refused one without stopping nor hanging', async () => {
    put.mockImplementation(async url => {
      if (url === 'orders/2') throw Object.assign(new Error('Forbidden'), { status: 403 })
      return {}
    })
    const vm = listVm([
      { id: 1, status: 'delivered' },
      { id: 2, status: 'delivered' },
      { id: 3, status: 'delivered' },
      { id: 4, status: 'invoiced' }
    ])
    await OrdersTable.methods.setBulkState.call(vm)
    expect(put.mock.calls.map(c => c[0])).toEqual(['orders/1', 'orders/2', 'orders/3'])
    expect(vm.importing).toBe(false)
    const last = vm.$buefy.snackbar.open.mock.calls.at(-1)[0]
    expect(last.type).toBe('is-danger')
    expect(last.message).toContain('Comandes canviades: 2')
    expect(last.message).toContain('#2')
    expect(last.message).toContain("oficina")
    // the failed row stays ticked to try again
    expect(vm.checkedRows.map(r => r.id)).toEqual([2])
    expect(vm.getData).toHaveBeenCalled()
  })
})

describe('a driver on delivery points (issues/191)', () => {
  it('leaves the pickup discount and the owner of an existing point to the office', () => {
    expect(driverLocksDiscount(DRIVER)).toBe(true)
    expect(driverLocksOwner(DRIVER, { id: 5 })).toBe(true)
    // a new point she makes is for a member
    expect(driverLocksOwner(DRIVER, { id: 0 })).toBe(false)
    expect(driverLocksDiscount(OFFICE)).toBe(false)
    expect(driverLocksDiscount([...OFFICE, 'orders_delivery'])).toBe(false)
    expect(driverLocksOwner(OFFICE, { id: 5 })).toBe(false)
  })
})
