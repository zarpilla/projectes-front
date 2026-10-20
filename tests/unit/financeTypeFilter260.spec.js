// issues/260: the «Tipus» filter of Ingressos/Despeses asked for the other kinds
// with `_limit=0`, which the API answers with every row (or one), so other
// document kinds leaked into the list, the KPIs and the export.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

const requested = () => get.mock.calls.map(c => c[0].split('?')[0])
const run = (component, documentType) => component.methods.getData.call({
  year: 2026, month: null, quarter: null, contact: null, project: null, paid: null,
  serial: null, code: null, state: 0, documentType,
  assignedToProject: () => false, formatDate: () => '', zeroPad: v => v
})

describe('«Tipus» filter requests only that kind (issues/260)', () => {
  beforeEach(() => get.mockClear())

  it('never sends _limit=0', async () => {
    for (const t of [0, -1, 5]) await run(EmittedInvoicesTable, t)
    for (const t of [0, -1, -2, 5]) await run(ReceivedInvoicesTable, t)
    expect(get.mock.calls.some(c => /_limit=0\b/.test(c[0]))).toBe(false)
  })

  it('Ingressos: a document type skips the invoices, «Factura» the other documents', async () => {
    await run(EmittedInvoicesTable, 5)
    expect(requested()).not.toContain('emitted-invoices/basic')
    expect(requested()).toContain('received-incomes/basic')
    get.mockClear()
    await run(EmittedInvoicesTable, -1)
    expect(requested()).toContain('emitted-invoices/basic')
    expect(requested()).not.toContain('received-incomes/basic')
  })

  it('Despeses: a document type, «Factura» and «Nòmina» each ask only for their own kind', async () => {
    await run(ReceivedInvoicesTable, 5)
    expect(requested().filter(u => /^(received-invoices|received-expenses|payrolls)$/.test(u))).toEqual(['received-expenses'])
    get.mockClear()
    await run(ReceivedInvoicesTable, -1)
    expect(requested().filter(u => /^(received-invoices|received-expenses|payrolls)$/.test(u))).toEqual(['received-invoices'])
    get.mockClear()
    await run(ReceivedInvoicesTable, -2)
    expect(requested().filter(u => /^(received-invoices|received-expenses|payrolls)$/.test(u))).toEqual(['payrolls'])
    get.mockClear()
    await run(ReceivedInvoicesTable, 0)
    expect(requested().filter(u => /^(received-invoices|received-expenses|payrolls)$/.test(u))).toEqual(['received-invoices', 'received-expenses', 'payrolls'])
  })
})
