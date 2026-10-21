// issues/278: the «Sèrie» filter of Ingressos/Despeses only reached the invoices
// query; received incomes, expenses and payrolls (which have no series) stayed
// listed and counted. Received incomes and expenses are filtered by the series
// too (issues/294); only payrolls, which have none, are hidden.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

const requested = () => get.mock.calls.map(c => c[0].split('?')[0])
  .filter(u => !/assigned$/.test(u))
const run = (component, serial) => component.methods.getData.call({
  year: 2026, month: null, quarter: null, contact: null, project: null, paid: null,
  serial, code: null, state: 0, documentType: 0,
  assignedToProject: () => false, formatDate: () => '', zeroPad: v => v
})

describe('«Sèrie» filter (issues/278)', () => {
  beforeEach(() => get.mockClear())

  it('Ingressos: with a series every request is filtered by it', async () => {
    await run(EmittedInvoicesTable, 3)
    expect(requested()).toEqual(['emitted-invoices/basic', 'received-incomes/basic'])
    // the lists, whatever the order they are asked in (issues/307: at once)
    expect(get.mock.calls.map(c => c[0]).find(u => u.startsWith('emitted-invoices'))).toContain('[serial_eq]=3')
    get.mockClear()
    await run(EmittedInvoicesTable, null)
    expect(requested()).toEqual(['emitted-invoices/basic', 'received-incomes/basic'])
  })

  it('Despeses: with a series payrolls are not requested, the rest filtered by it', async () => {
    await run(ReceivedInvoicesTable, 3)
    expect(requested()).toEqual(['received-invoices', 'received-expenses'])
    expect(get.mock.calls.map(c => c[0]).find(u => u.startsWith('received-invoices'))).toContain('[serial_eq]=3')
    get.mockClear()
    await run(ReceivedInvoicesTable, null)
    expect(requested()).toEqual(['received-invoices', 'received-expenses', 'payrolls'])
  })
})
