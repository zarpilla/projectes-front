// issues/294: received incomes and expenses do have a series (regression of 278,
// which stopped requesting them while a series was chosen). With a series they are
// requested filtered by it; only payrolls (no series) are hidden.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

const calls = () => get.mock.calls.map(c => c[0]).filter(u => !/assigned\?/.test(u))
const path = u => u.split('?')[0]
const run = (component, serial, documentType = 0) => component.methods.getData.call({
  year: 2026, month: null, quarter: null, contact: null, project: null, paid: null,
  serial, code: null, state: 0, documentType,
  assignedToProject: () => false, formatDate: () => '', zeroPad: v => v
})

describe('«Sèrie» filter keeps incomes and expenses (issues/294)', () => {
  beforeEach(() => get.mockClear())

  it('Ingressos: invoices and received incomes, both filtered by the series', async () => {
    await run(EmittedInvoicesTable, 3)
    expect(calls().map(path)).toEqual(['emitted-invoices/basic', 'received-incomes/basic'])
    calls().forEach(u => expect(u).toContain('[serial_eq]=3'))
  })

  it('Despeses: invoices and expenses filtered by the series, payrolls hidden', async () => {
    await run(ReceivedInvoicesTable, 3)
    expect(calls().map(path)).toEqual(['received-invoices', 'received-expenses'])
    calls().forEach(u => expect(u).toContain('[serial_eq]=3'))
  })

  it('Despeses: series + an expense «Tipus» requests the expenses of that series', async () => {
    await run(ReceivedInvoicesTable, 3, 5)
    expect(calls().map(path)).toEqual(['received-expenses'])
    expect(calls()[0]).toContain('[serial_eq]=3')
    expect(calls()[0]).toContain('[document_type_eq]=5')
  })
})
