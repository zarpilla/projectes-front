// issues/226 (redesign review 5): «Guardar i sortir» left the delivery point
// when it was not saved, the route planner export failed on an order without a
// phone, scanning an unknown id said «Not Found» and a driver was told she
// could change the state of an invoiced order.
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import ContactsUserForm from '@/components/ContactsUserForm.vue'
import ContactsForm from '@/components/ContactsForm.vue'
import OrdersTable from '@/components/OrdersTable.vue'
import DepositsTable from '@/components/DepositsTable.vue'
import TransfersTable from '@/components/TransfersTable.vue'
import { processedOrderNotice } from '@/domain/orderPermissions'

const DRIVER = ['orders_delivery', 'hours']

describe('«Guardar i sortir» (issues/226)', () => {
  it('stays on a delivery point that misses required fields', async () => {
    const vm = {
      readOnly: false,
      form: { id: 5, trade_name: 'Can Pere', address: 'C/ Major 1', city: 'Vic', postcode: '08500', owner: 7, phone: '', nif: '', sector: null },
      errors: {},
      validateTimeSlots: () => ({}),
      $buefy: { snackbar: { open: vi.fn() } },
      $refs: {},
      redirectToView: vi.fn()
    }
    vm.submit = () => ContactsUserForm.methods.submit.call(vm)
    await ContactsUserForm.methods.submitExit.call(vm)
    expect(vm.$buefy.snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Falten/) }))
    expect(vm.redirectToView).not.toHaveBeenCalled()
  })

  it('leaves once saved', async () => {
    for (const form of [ContactsUserForm, ContactsForm]) {
      const vm = { submit: vi.fn(async () => undefined), redirectToView: vi.fn() }
      await form.methods.submitExit.call(vm)
      expect(vm.redirectToView).toHaveBeenCalled()
      vm.redirectToView.mockClear()
      vm.submit = vi.fn(async () => false)
      await form.methods.submitExit.call(vm)
      expect(vm.redirectToView).not.toHaveBeenCalled()
    }
  })
})

describe('route planner export (issues/226)', () => {
  it('handles an order without a phone', () => {
    expect(OrdersTable.methods.phoneFormatted(null)).toBe('')
    expect(OrdersTable.methods.phoneFormatted(undefined)).toBe('')
    expect(OrdersTable.methods.phoneFormatted('+34 600 11 22 33')).toBe('34600112233')
    expect(OrdersTable.methods.phoneFormatted('938 00 00 00')).toBe('34938000000')
  })
})

describe('scanning an unknown id (issues/226)', () => {
  it.each([['Dipòsits', DepositsTable], ['Transferències', TransfersTable]])('%s says «Comanda no trobada»', async (_name, table) => {
    get.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not Found' } } })
    const history = vi.fn()
    const vm = { isAdmin: true, currentUserId: 9, statusFilter: 'pending', $buefy: { toast: { open: vi.fn() } } }
    await table.methods.handleScannedOrder.call(vm, 99999, history)
    expect(history).toHaveBeenCalledWith(99999, 'error', 'Comanda no trobada')
    expect(vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ message: 'Comanda #99999 no trobada' }))
  })
})

describe('driver banner (issues/226)', () => {
  it('does not offer her the state of an invoiced order', () => {
    expect(processedOrderNotice({ id: 1, status: 'invoiced' }, DRIVER)).not.toMatch(/moviments i l'estat/)
    expect(processedOrderNotice({ id: 1, status: 'invoiced' }, DRIVER)).toMatch(/l'estat i la resta de dades els canvia l'oficina/)
    expect(processedOrderNotice({ id: 1, status: 'delivered' }, DRIVER)).toMatch(/moviments i l'estat/)
  })
})
