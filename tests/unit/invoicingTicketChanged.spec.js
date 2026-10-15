// issues/049 — the "Ticket" field of the invoicing modal (a treasury payment ↔ its
// document) called ticketChanged, which never existed: picking a ticket left a
// received invoice or a diet selected too. Like its siblings, it must clear them.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ModalBoxInvoicing from '@/components/ModalBoxInvoicing.vue'

const filled = () => ({
  form: { ticket: { id: 7 }, received: { id: 3 }, diet: { id: 5 }, expense: { id: 9 } },
  receivedSearch: 'F-3', dietSearch: 'D-5', ticketSearch: 'T-7', expenseSearch: 'E-9'
})

describe('ModalBoxInvoicing ticketChanged', () => {
  it('clears the received invoice and the diet once a ticket is picked', () => {
    const vm = filled()
    ModalBoxInvoicing.methods.ticketChanged.call(vm)
    expect(vm.form).toEqual({ ticket: { id: 7 }, received: null, diet: null, expense: { id: 9 } })
    expect([vm.receivedSearch, vm.dietSearch, vm.ticketSearch]).toEqual(['', '', 'T-7'])
  })

  it('leaves everything while no ticket is picked (typing in the field)', () => {
    const vm = filled()
    vm.form.ticket = null
    ModalBoxInvoicing.methods.ticketChanged.call(vm)
    expect(vm.form.received).toEqual({ id: 3 })
    expect(vm.form.diet).toEqual({ id: 5 })
  })
})
