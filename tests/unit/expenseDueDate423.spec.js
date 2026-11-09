// issues/423 (2026-11-09): a «Dieta» or «Altres» in Despeses had no
// «Venciment», so an unpaid one sat in Tresoreria on its issue date, and the
// project line it is assigned to could not take the date as «Previsió pag.».
// Now the field shows on Despeses as on invoices.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DocumentForm from '@/components/DocumentForm.vue'
import ProjectPhases from '@/components/ProjectPhases.vue'

describe('«Venciment» on Despeses (issues/423)', () => {
  const showPaybefore = (type) => DocumentForm.computed.showPaybefore.call({ type, readOnly: false })

  it('shows on Despeses, as on received invoices, tiquets and dietes', () => {
    expect(showPaybefore('received-expenses')).toBe(true)
    expect(showPaybefore('received-invoices')).toBe(true)
    expect(showPaybefore('tickets')).toBe(true)
    expect(showPaybefore('diets')).toBe(true)
  })

  it('still not on incomes, payrolls or quotes', () => {
    expect(showPaybefore('received-incomes')).toBe(false)
    expect(showPaybefore('payrolls')).toBe(false)
    expect(showPaybefore('quotes')).toBe(false)
  })

  it('an unpaid Despesa gives its due date to the line as «Previsió pag.»', () => {
    const date = ProjectPhases.methods.calculatePaymentDate.call({
      documentPaidDate: null,
      documentEstimatedPayment: undefined,
      documentPaybefore: new Date(2026, 11, 15),
      documentEmitted: new Date(2026, 10, 9)
    })
    expect(date.toDateString()).toBe(new Date(2026, 11, 15).toDateString())
  })
})
