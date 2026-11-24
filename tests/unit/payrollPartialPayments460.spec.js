// issues/460: a bestreta can be paid to the person in several goes, as invoices
// and expenses (issues/412). The form's «Pagaments parcials» add up to the net
// (not the payroll's total cost), «Pagada» and its date follow from them, and
// Bestretes says «Pagada en part» while some of the net is still to pay.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(async () => ({ data: {} })) }
vi.mock('@/service/index', () => ({ default: () => api }))
import DocumentForm from '@/components/DocumentForm.vue'
import DedicationSalaryMonth from '@/components/DedicationSalaryMonth.vue'
import { PARTIAL_PAYMENT_TYPES, partialPaymentsTotal, isPaidInPart } from '@/domain/partialPayments.js'
import { monthPayrollRows } from '@/domain/monthPayrolls.js'

const day = s => new Date(`${s}T00:00:00`)

describe('the rules', () => {
  it('bestretes take partial payments, by their net', () => {
    expect(PARTIAL_PAYMENT_TYPES).toContain('payrolls')
    expect(partialPaymentsTotal('payrolls', { net_base: '1200.00', total: 1700 })).toBe(1200)
    expect(partialPaymentsTotal('received-invoices', { net_base: 5, total: 1700 })).toBe(1700)
  })

  it('«Pagada en part»: some payments, not paid yet', () => {
    expect(isPaidInPart({ paid: false, partial_payments: [{ date: '2026-03-31', amount: 500 }] })).toBe(true)
    expect(isPaidInPart({ paid: true, partial_payments: [{ date: '2026-03-31', amount: 1200 }] })).toBe(false)
    expect(isPaidInPart({ paid: false, partial_payments: null })).toBe(false)
  })
})

describe('DocumentForm of a bestreta', () => {
  const { computed, methods } = DocumentForm
  const vm = partial_payments => {
    const v = {
      type: 'payrolls',
      total: 1700,
      form: { id: 9, net_base: '1200.00', total: 1700, paid: false, paid_date: null, partial_payments }
    }
    for (const name of ['partialPaymentsAllowed', 'hasPartialPayments', 'partialPaymentsDoc', 'partialPaymentsPaid', 'partialPaymentsPending', 'partialPaymentsExceed']) {
      Object.defineProperty(v, name, { get: () => computed[name].call(v) })
    }
    return v
  }

  it('the payments add up to the net: pending, paid on the last date, and over it', () => {
    const part = vm([{ date: day('2026-03-31'), amount: 500 }])
    expect([part.partialPaymentsAllowed, part.partialPaymentsPaid, part.partialPaymentsPending]).toEqual([true, 500, 700])
    methods.partialPaymentsChanged.call(part)
    expect([part.form.paid, part.form.paid_date]).toEqual([false, null])

    const all = vm([{ date: day('2026-03-31'), amount: 500 }, { date: day('2026-04-15'), amount: 700 }])
    methods.partialPaymentsChanged.call(all)
    expect([all.form.paid, all.form.paid_date]).toEqual([true, day('2026-04-15')])

    // the net, not the payroll's total cost (1.700 €)
    expect(vm([{ date: day('2026-03-31'), amount: 1300 }]).partialPaymentsExceed).toBe(true)
  })
})

describe('Bestretes of a month', () => {
  beforeEach(() => api.get.mockReset())

  it('says «Pagada en part» while some of the net is still to pay', async () => {
    const base = { year: { year: 2026 }, month: { month: 3 }, net_base: 1200, total: 1700, emitted: '2026-03-31' }
    api.get.mockResolvedValue({
      data: [
        { ...base, id: 1, users_permissions_user: { username: 'Anna' }, paid: false, partial_payments: [{ id: 'a', date: '2026-03-31', amount: 500 }] },
        { ...base, id: 2, users_permissions_user: { username: 'Bet' }, paid: true, paid_date: '2026-03-31' },
        { ...base, id: 3, users_permissions_user: { username: 'Carla' }, paid: false }
      ]
    })
    expect(monthPayrollRows((await api.get()).data, 2026, 3).map(r => r.paidInPart)).toEqual([true, false, false])

    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }] })
    const w = mount(DedicationSalaryMonth, { props: { year: 2026, month: 3 }, global: { plugins: [Buefy, router], config: { warnHandler: () => {} } } })
    await flushPromises()
    const tags = w.findAll('tbody tr').map(tr => tr.find('.tag').text())
    expect(tags).toEqual(['Pagada en part', 'Pagada', 'Per pagar'])
    w.unmount()
  })
})
