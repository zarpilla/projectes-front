// issues/307: the document form asked its eight lists (series, payment
// methods, projects 1.7 MB, me, contacts 1.1 MB, document types, products...)
// one after another before loading the document itself. They go at once now,
// and the form gets the same values.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import DocumentForm from '@/components/DocumentForm.vue'

let pending
beforeEach(() => {
  pending = []
  api.get.mockReset()
  api.get.mockImplementation(url => new Promise(resolve => pending.push({ url, resolve })))
})

const DATA = {
  series: [{ id: 1, name: '2026' }],
  'payment-methods': [{ id: 2, name: 'Transferència' }],
  'bank-accounts': [{ id: 3, name: 'Cajamar' }],
  'projects/basic': [
    { id: 10, name: 'Actiu', project_state: { can_assign_documents: true } },
    { id: 11, name: 'Tancat', project_state: { can_assign_documents: false } },
    { id: 12, name: 'Mare', is_mother: true, project_state: { can_assign_documents: true } }
  ],
  me: { quotes: { id: 5 } },
  'contacts/basic': [{ id: 20, name: 'Clienta' }],
  'document-types': [{ id: 30, name: 'Tipus' }],
  products: [{ id: 40, code: 'P1', name: 'Producte' }]
}
const answerAll = () => pending.forEach(p => p.resolve({ data: DATA[p.url.split('?')[0]] }))
const ctx = (type, over) => ({ type, form: { id: 0, document_type: null }, ...over })

describe('document form lists (issues/307)', () => {
  it('asks every list at once', async () => {
    const vm = ctx('emitted-invoices')
    const done = DocumentForm.methods.getAuxiliarData.call(vm)
    await flushPromises()
    expect(pending.map(p => p.url.split('?')[0]).sort()).toEqual(
      ['contacts/basic', 'document-types', 'me', 'payment-methods', 'products', 'projects/basic', 'series']
    )
    answerAll()
    await done
    expect(vm.series).toEqual(DATA.series)
    expect(vm.paymentMethods).toEqual(DATA['payment-methods'])
    expect(vm.quotes).toEqual({ id: 5 })
    // a new document: only projects that take documents, no mothers
    expect(vm.projects.map(p => p.id)).toEqual([10])
    expect(vm.clients).toEqual(DATA['contacts/basic'])
    expect(vm.documentTypes).toEqual(DATA['document-types'])
    expect(vm.form.document_type).toBe(30)
    expect(vm.products).toEqual([{ id: 40, code: 'P1', name: 'Producte', namecode: 'P1 - Producte' }])
  })

  it('a saved document lists every project; payrolls ask the bank accounts, not the products', async () => {
    const vm = ctx('payrolls', { form: { id: 7, document_type: 9 } })
    const done = DocumentForm.methods.getAuxiliarData.call(vm)
    await flushPromises()
    const asked = pending.map(p => p.url.split('?')[0])
    expect(asked).toContain('bank-accounts')
    expect(asked).not.toContain('products')
    answerAll()
    await done
    expect(vm.bankAccounts).toEqual(DATA['bank-accounts'])
    expect(vm.projects.map(p => p.id)).toEqual([10, 11, 12])
    expect(vm.form.document_type).toBe(9)
    expect(vm.products).toBeUndefined()
  })
})
