// issues/307: Ingressos and Despeses asked their lists one after another, and
// then the documents assigned to budget lines (`*/assigned`, slower than the
// lists themselves) on every change of filter. Everything is asked at once
// now (and the server keeps `*/assigned` in its read cache).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'

let pending
beforeEach(() => {
  pending = []
  api.get.mockReset()
  api.get.mockImplementation(url => new Promise(resolve => pending.push({ url, resolve })))
})

const ctx = over => ({
  year: 2026, month: null, quarter: null, contact: null, project: null, paid: null,
  serial: null, code: null, state: 0, documentType: 0,
  assignedToProject: (e, assigned) => assigned.invoices.includes(e.id),
  formatDate: () => '', zeroPad: v => v, ...over
})

const answerAll = () => {
  for (const p of pending) {
    const data = p.url.includes('/assigned')
      ? { invoices: [1], incomes: [], expenses: [] }
      : p.url.startsWith('payrolls')
        ? []
        : [{ id: 1, code: 'A', lines: [], document_type: { name: 'Tipus' } }]
    p.resolve({ data })
  }
}

describe('Ingressos and Despeses ask everything at once (issues/307)', () => {
  it('Despeses: invoices, expenses, payrolls and the assigned ones together', async () => {
    const vm = ctx()
    const done = ReceivedInvoicesTable.methods.getData.call(vm)
    await flushPromises()
    expect(pending.map(p => p.url.split('?')[0].replace(/\/list$/, '')).sort()).toEqual(
      ['payrolls', 'phase-expenses/assigned', 'received-expenses', 'received-invoices']
    )
    answerAll()
    await done
    expect(vm.emitted.map(r => [r.type, r.assigned])).toEqual([
      ['received-invoices', true],
      ['received-expenses', true]
    ])
  })

  it('Ingressos: invoices, received incomes and the assigned ones together', async () => {
    const vm = ctx()
    const done = EmittedInvoicesTable.methods.getData.call(vm)
    await flushPromises()
    expect(pending.map(p => p.url.split('?')[0].replace(/\/list$/, '')).sort()).toEqual(
      ['emitted-invoices/basic', 'phase-incomes/assigned', 'received-incomes/basic']
    )
    answerAll()
    await done
    expect(vm.emitted.map(r => r.type)).toEqual(['emitted-invoices', 'received-incomes'])
  })

  it('a list left out by the filters is not asked', async () => {
    const vm = ctx({ documentType: -1 })
    const done = ReceivedInvoicesTable.methods.getData.call(vm)
    await flushPromises()
    expect(pending.map(p => p.url.split('?')[0].replace(/\/list$/, '')).sort()).toEqual(['phase-expenses/assigned', 'received-invoices'])
    answerAll()
    await done
  })
})
