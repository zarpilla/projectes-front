// issues/312: invoices made by «Facturar» print a concept on the PDF, e.g.
// «Serveis de Transport i Logística_Octubre_2026». The text is set in
// Configuració → Logística (me.orders_options.invoice_concept); the invoice keeps
// it in `concept`, editable in the form while it is a draft. `document_concept`
// stays the internal concept.
import { describe, it, expect, vi } from 'vitest'

const put = vi.fn().mockResolvedValue({ data: {} })
const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ put, get }) }))
import MeForm from '@/components/MeForm.vue'
import meFormSource from '@/components/MeForm.vue?raw'
import documentFormSource from '@/components/DocumentForm.vue?raw'
import { fieldLabels } from '@/domain/documentHistory'

describe('the concept printed on logistics invoices (issues/312)', () => {
  it('is edited in Configuració → Logística and sent with the logistics block', async () => {
    expect(meFormSource).toContain('v-model="form.orders_options.invoice_concept"')
    get.mockImplementation(async url => (url === 'users/me'
      ? { data: { permissions: [{ permission: 'orders_admin' }] } }
      : { data: { name: 'Coop', orders_options: { id: 3, next_day_limit_hour: 14 } } }))
    const c = { form: { ...MeForm.data.call({}).form }, $buefy: { toast: { open: vi.fn() }, snackbar: { open: vi.fn() } } }
    await MeForm.methods.loadData.call(c)
    c.form.orders_options.invoice_concept = 'Serveis de Transport i Logística'
    await MeForm.methods.submit.call(c)
    expect(put.mock.calls.at(-1)[1].orders_options).toEqual({
      id: 3,
      next_day_limit_hour: 14,
      invoice_concept: 'Serveis de Transport i Logística'
    })
  })

  it('is a field of the issued-invoice form, locked once issued', () => {
    const field = documentFormSource.match(/<b-field v-if="type === 'emitted-invoices'" label="Concepte a la factura"[\s\S]*?<\/b-field>/)
    expect(field).not.toBeNull()
    expect(field[0]).toContain('v-model="form.concept"')
    expect(field[0]).toContain(':disabled="emittedInvoiceEditDisabled"')
  })

  it('has its own label in the change history, apart from the internal concept', () => {
    const labels = fieldLabels('emitted-invoice')
    expect(labels.concept).toBe('Concepte a la factura')
    expect(labels.document_concept).toBe('Concepte intern')
  })
})
