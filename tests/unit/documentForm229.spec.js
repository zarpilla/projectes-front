// issues/229: quotes showed a due date they cannot store, and a new
// rectificative (form.id 0) gave `disabled` props the Number 0 («Invalid prop:
// type check failed for prop "disabled". Expected Boolean, got Number»).
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DocumentForm from '@/components/DocumentForm.vue'

describe('DocumentForm slips (issues/229)', () => {
  const showPaybefore = type => DocumentForm.computed.showPaybefore.call({ type, readOnly: false })

  it('hides «Venciment» on quotes, which have no paybefore', () => {
    expect(showPaybefore('quotes')).toBe(false)
    expect(showPaybefore('emitted-invoices')).toBe(true)
    expect(showPaybefore('received-invoices')).toBe(true)
    expect(showPaybefore('received-expenses')).toBe(false)
    expect(DocumentForm.computed.showPaybefore.call({ type: 'emitted-invoices', readOnly: true })).toBe(false)
  })

  it('gives the disabled props a Boolean on a new rectificative', () => {
    const disabled = form => DocumentForm.computed.emittedInvoiceEditDisabled.call({ type: 'emitted-invoices', form, canEditDraft: false })
    expect(disabled({ id: 0, code: null })).toBe(false)
    expect(disabled({ id: 5, code: '2026-1' })).toBe(true)
    expect(DocumentForm.computed.emittedInvoiceEditDisabled.call({ type: 'quotes', form: { id: 0 } })).toBe(false)
  })
})
