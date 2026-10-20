// issues/256: a received income emitted on 19/10/2026 took its budget line's
// 31/07/2026 as estimated payment (an unpaid July movement in Tresoreria at
// once); «Cobrada» ticked without a date saved paid without date, and a date
// without the box saved it as unpaid.
import { describe, it, expect } from 'vitest'
import { estimatedPaymentFrom, setPaid, setPaidDate } from '@/domain/documentDates'
import DocumentForm from '@/components/DocumentForm.vue'

describe('estimated payment from the budget line (issues/256)', () => {
  const emitted = new Date(2026, 9, 19)

  it('never before the emission date', () => {
    expect(estimatedPaymentFrom('2026-07-31', emitted)).toBe(emitted)
    expect(estimatedPaymentFrom('2027-02-28', emitted)).toBe('2027-02-28')
    expect(estimatedPaymentFrom('2026-10-19', '2026-10-19')).toBe('2026-10-19')
    expect(estimatedPaymentFrom('2026-07-31', null)).toBe('2026-07-31')
  })

  it('in the form, when the document is assigned to a line', () => {
    const vm = {
      type: 'received-incomes',
      form: {
        id: null,
        emitted,
        estimated_payment: null,
        paid: false,
        projects: [{ project_phases: [{ incomes: [{ assign: true, date: '2026-07-31' }], expenses: [] }] }]
      }
    }
    DocumentForm.methods.validateIfProjectPhasesHasDocument.call(vm)
    expect(vm.form.estimated_payment).toBe(emitted)
  })
})

describe('«Cobrada/Pagada» and its date (issues/256)', () => {
  const today = new Date(2026, 9, 20)

  it('ticking without a date fills in today', () => {
    expect(setPaid({ paid: false, paid_date: null }, true, today)).toEqual({ paid: true, paid_date: today })
  })

  it('ticking keeps a date already chosen', () => {
    const d = new Date(2026, 9, 1)
    expect(setPaid({ paid: false, paid_date: d }, true, today).paid_date).toBe(d)
  })

  it('unticking clears the date', () => {
    expect(setPaid({ paid: true, paid_date: today }, false)).toEqual({ paid: false, paid_date: null })
  })

  it('choosing a date ticks the box', () => {
    expect(setPaidDate({ paid: false, paid_date: null }, today)).toEqual({ paid: true, paid_date: today })
  })
})
