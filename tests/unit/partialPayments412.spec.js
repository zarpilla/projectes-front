// issues/412: invoices and other incomes collected in several goes, and
// expenses paid in instalments. The form lists the partial payments (date +
// amount), sets «Cobrada/Pagada» from them and refuses more than the total;
// the lists show «Parcial» and the contact's «Resum» counts what is pending.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DocumentForm from '@/components/DocumentForm.vue'
import {
  paidAmount,
  pendingAmount,
  isPartiallyPaid,
  exceedsTotal,
  applyPartialPaymentsToForm,
  newPartialPayment
} from '@/domain/partialPayments.js'
import { documentDatesForApi, documentDatesForPickers } from '@/domain/documentDates.js'
import { docStatus, summaryFigures, ALL_YEARS } from '@/domain/contactSummary.js'

const doc = (extra = {}) => ({
  total: 1000,
  partial_payments: [
    { id: 'a', date: '2026-03-01', amount: 600 },
    { id: 'b', date: '2026-04-01', amount: 150.5 }
  ],
  ...extra
})

describe('partial payments (issues/412)', () => {
  it('adds them up and gives what is pending', () => {
    expect(paidAmount(doc())).toBe(750.5)
    expect(pendingAmount(doc())).toBe(249.5)
    expect(isPartiallyPaid(doc())).toBe(true)
    expect(isPartiallyPaid({ total: 10 })).toBe(false)
    expect(isPartiallyPaid(doc({ paid_date: '2026-04-01' }))).toBe(false)
  })

  it('knows when they go over the total', () => {
    expect(exceedsTotal(doc({ total: 750 }))).toBe(true)
    expect(exceedsTotal(doc({ total: 750.5 }))).toBe(false)
  })

  it('sets «Cobrada» and its date once they reach the total, as the server does', () => {
    const form = doc({ total: 750.5, paid: false, paid_date: null })
    form.partial_payments = form.partial_payments.map(p => ({ ...p, date: new Date(`${p.date}T00:00:00`) }))
    applyPartialPaymentsToForm(form)
    expect(form.paid).toBe(true)
    expect(form.paid_date).toEqual(new Date('2026-04-01T00:00:00'))

    const part = doc({ paid: true, paid_date: new Date() })
    applyPartialPaymentsToForm(part)
    expect(part.paid).toBe(false)
    expect(part.paid_date).toBeNull()
  })

  it('suggests what is still pending for a new one', () => {
    const today = new Date('2026-05-01T00:00:00')
    expect(newPartialPayment(doc(), today)).toEqual({ date: today, amount: 249.5 })
    expect(newPartialPayment({ total: 0 }, today).amount).toBeNull()
  })

  it('goes to the datepickers as dates and back to the API as days', () => {
    const form = documentDatesForPickers(doc())
    expect(form.partial_payments[0].date).toBeInstanceOf(Date)
    form.partial_payments[1].amount = '150.50'
    expect(documentDatesForApi(form).partial_payments).toEqual([
      { id: 'a', date: '2026-03-01', amount: 600 },
      { id: 'b', date: '2026-04-01', amount: 150.5 }
    ])
    expect(documentDatesForApi({ partial_payments: [] }).partial_payments).toBeNull()
    expect('partial_payments' in documentDatesForApi({ emitted: '2026-01-01' })).toBe(false)
  })
})

describe('DocumentForm partial payments (issues/412)', () => {
  const { computed, methods } = DocumentForm

  it('are offered on invoices, incomes and expenses, not on quotes or payrolls', () => {
    const allowed = type => computed.partialPaymentsAllowed.call({ type })
    expect(['emitted-invoices', 'received-incomes', 'received-invoices', 'received-expenses'].map(allowed)).toEqual([
      true, true, true, true
    ])
    expect(allowed('quotes')).toBe(false)
    expect(allowed('payrolls')).toBe(false)
  })

  it('refuses to save more than the total', async () => {
    const snackbar = vi.fn()
    const vm = {
      type: 'emitted-invoices',
      form: { ...doc(), partial_payments: [{ date: new Date(), amount: 1200 }] },
      hasPartialPayments: true,
      partialPaymentsExceed: true,
      isLoading: false,
      $buefy: { snackbar: { open: snackbar } }
    }
    await methods.submit.call(vm, false)
    expect(snackbar).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger', message: expect.stringMatching(/superen el total/) }))
    expect(vm.isLoading).toBe(false)
  })
})

describe('contact «Resum» with partial payments (issues/412)', () => {
  it('shows «Parcial» and counts only what is pending', () => {
    const sale = { kind: 'emitted-invoices', emitted: '2026-02-01', total_base: 826.45, ...doc() }
    expect(docStatus(sale).label).toBe('Parcial')
    expect(summaryFigures([sale], ALL_YEARS).toCollect).toBe(249.5)
  })
})
