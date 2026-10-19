// issues/193, reopened by redesign review 5 (2026-10-19): on the order form a
// driver could click «Lliurada», but she has no «Guardar» (she doesn't edit the
// order), so the state was lost silently while the banner said «En pots
// registrar els moviments i l'estat». Like in Operacions, she now saves it at
// once (the API takes the state and the delivery date from a driver), with a
// message, and a refusal is reported and the stored state comes back.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const put = vi.fn()
vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(async () => ({ data: { id: 300 } })), put, post: vi.fn() })
}))
import OrdersForm from '@/components/OrdersForm.vue'
import { savesOperationsAtOnce } from '@/domain/orderPermissions'
import { statusChange } from '@/domain/orderStatus'

const DRIVER = ['orders_delivery', 'hours']
const OFFICE = ['orders_admin']
const MEMBER = ['orders']

function formVm (permissions, status = 'processed') {
  const vm = {
    form: { id: 24799, status, delivery_date: null },
    firstStatus: status,
    permissions,
    isLoading: false,
    historyKey: 0,
    statusLabel: s => s,
    getData: vi.fn(),
    $buefy: {
      dialog: { confirm: vi.fn(({ onConfirm }) => onConfirm()) },
      toast: { open: vi.fn() },
      snackbar: { open: vi.fn() }
    }
  }
  vm.savesAtOnce = OrdersForm.computed.savesAtOnce.call(vm)
  vm.saveOperation = OrdersForm.methods.saveOperation.bind(vm)
  return vm
}

describe("a driver's state change on the order form (issues/193)", () => {
  // braces: a function returned by beforeEach runs as its teardown
  beforeEach(() => { put.mockReset() })

  it('is saved at once, with a message', async () => {
    put.mockResolvedValue({})
    const vm = formVm(DRIVER)
    await OrdersForm.methods.pickStatus.call(vm, 'delivered')
    await vi.waitFor(() => expect(vm.$buefy.toast.open).toHaveBeenCalled())
    expect(put).toHaveBeenCalledTimes(1)
    const [url, body] = put.mock.calls[0]
    expect(url).toBe('orders/24799')
    expect(body.status).toBe('delivered')
    expect(body.delivery_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(vm.form.status).toBe('delivered')
    expect(vm.firstStatus).toBe('delivered')
    expect(vm.isLoading).toBe(false)
  })

  it('reports a refusal and goes back to the stored state', async () => {
    put.mockImplementation(async () => { throw Object.assign(new Error('Forbidden'), { response: { status: 403, data: { error: { message: 'Forbidden' } } } }) })
    const vm = formVm(DRIVER)
    await OrdersForm.methods.pickStatus.call(vm, 'delivered')
    await vi.waitFor(() => expect(vm.$buefy.snackbar.open).toHaveBeenCalled())
    expect(vm.form.status).toBe('processed')
    expect(vm.firstStatus).toBe('processed')
    expect(vm.isLoading).toBe(false)
  })

  it('stays a pick saved with the form for the office', async () => {
    const vm = formVm(OFFICE)
    await OrdersForm.methods.pickStatus.call(vm, 'delivered')
    expect(put).not.toHaveBeenCalled()
    expect(vm.form.status).toBe('delivered')
  })

  it('saves at once only for whoever moves the order without editing it', () => {
    expect(savesOperationsAtOnce({ id: 1, status: 'processed' }, DRIVER)).toBe(true)
    expect(savesOperationsAtOnce({ id: 1, status: 'processed' }, OFFICE)).toBe(false)
    expect(savesOperationsAtOnce({ id: 1, status: 'pending' }, MEMBER)).toBe(false)
    expect(savesOperationsAtOnce({ status: 'pending' }, DRIVER)).toBe(false)
    expect(savesOperationsAtOnce({ id: 1, status: 'cancelled' }, DRIVER)).toBe(false)
  })

  it('sends the delivery date with «Lliurada» when there is none', () => {
    expect(statusChange({ delivery_date: null }, 'delivered', '2026-10-19')).toEqual({ status: 'delivered', delivery_date: '2026-10-19' })
    expect(statusChange({ delivery_date: new Date() }, 'delivered', '2026-10-19')).toEqual({ status: 'delivered' })
    expect(statusChange({}, 'processed', '2026-10-19')).toEqual({ status: 'processed' })
  })
})
