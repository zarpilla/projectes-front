// issues/213: small finance slips found in the fourth redesign review.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DocumentForm from '@/components/DocumentForm.vue'
import DocumentLines from '@/components/DocumentLines.vue'
import Justification from '@/components/Justification.vue'

describe('new document payment method (issues/213)', () => {
  const methods = [{ id: 7, name: 'Efectiu' }, { id: 2, name: 'Transferència Cajamar' }]
  const run = ctx => { DocumentForm.methods.setDefaultPaymentMethod.call(ctx); return ctx.form.payment_method }

  it('shows the one the API would give it (the first), instead of an empty select', () => {
    expect(run({ type: 'emitted-invoices', paymentMethods: methods, form: { payment_method: null } })).toBe(2)
    expect(run({ type: 'received-expenses', paymentMethods: methods, form: {} })).toBe(2)
  })

  it('keeps a method already chosen, and leaves types without a default alone', () => {
    expect(run({ type: 'emitted-invoices', paymentMethods: methods, form: { payment_method: 7 } })).toBe(7)
    expect(run({ type: 'quotes', paymentMethods: methods, form: {} })).toBeUndefined()
    expect(run({ type: 'emitted-invoices', paymentMethods: [], form: {} })).toBeUndefined()
  })
})

describe('line placeholders (issues/213)', () => {
  it('IVA % and IRPF % no longer say «Preu per unitat»', () => {
    const w = mount(DocumentLines, {
      props: { lines: [{ concept: 'A', base: 10, quantity: 1, discount: 0, vat: '', irpf: '', comments: '', show: false }], newLine: () => ({}) },
      global: { plugins: [Buefy] }
    })
    expect(w.find('input[name="vat"]').attributes('placeholder')).toBe('IVA %')
    expect(w.find('input[name="irpf"]').attributes('placeholder')).toBe('IRPF %')
  })
})

describe('Justificacions with Any = Tots (issues/213)', () => {
  const forYear = year => Justification.methods.forYear.call({ year, grantYearLabel: y => String(y) })

  it('says no year for «Tots» («Cap projecte en té per al Tots»)', () => {
    expect(forYear('Tots')).toBe('')
    expect(forYear(null)).toBe('')
    expect(forYear(2026)).toBe(' per al 2026')
  })
})

describe('«Nòmina» spelling (issues/213)', () => {
  it('Despeses writes Nòmina, not Nómina', () => {
    for (const file of ['src/views/ReceivedInvoices.vue', 'src/components/ReceivedInvoicesTable.vue']) {
      expect(readFileSync(resolve(__dirname, '../..', file), 'utf8')).not.toContain('Nómina')
    }
  })
})
