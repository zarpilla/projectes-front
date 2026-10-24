// issues/325 (2026-10-23): Despeses read a whole period of received invoices,
// expenses and payrolls with the core find (populate=*): 3–9 s per load on
// resilience, single requests up to 19 s. It now reads `<type>/list`: the same
// filters, only what the screen shows and exports, from the read cache.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'

const ctx = over => ({
  year: 2025, month: null, quarter: null, contact: null, project: null, paid: null,
  serial: null, code: '', documentType: null,
  assignedToProject: () => false, formatDate: () => '', zeroPad: v => v, ...over
})

beforeEach(() => {
  api.get.mockReset()
  api.get.mockImplementation(async url =>
    url.startsWith('phase-expenses/assigned') ? { data: { invoices: [], expenses: [] } } : { data: [] })
})

const listCalls = () => api.get.mock.calls.map(c => c[0]).filter(u => !u.startsWith('phase-expenses'))

describe('Despeses lists (issues/325)', () => {
  it('reads the three lists from /list with the period', async () => {
    await ReceivedInvoicesTable.methods.getData.call(ctx())
    expect(listCalls()).toEqual([
      'received-invoices/list?_limit=-1&_where[emitted_gte]=2025-01-01&[emitted_lte]=2025-12-31',
      'received-expenses/list?_limit=-1&_where[emitted_gte]=2025-01-01&[emitted_lte]=2025-12-31',
      'payrolls/list?_limit=-1&_where[emitted_gte]=2025-01-01&[emitted_lte]=2025-12-31'
    ])
  })

  it('sends the same filters as before', async () => {
    await ReceivedInvoicesTable.methods.getData.call(ctx({ quarter: 2, contact: 336, paid: 1, serial: 6, code: 'F' }))
    expect(listCalls()).toEqual([
      'received-invoices/list?_limit=-1&_where[emitted_gte]=2025-04-01&[emitted_lte]=2025-06-30&[contact_eq]=336&[paid_date_null]=false&[serial_eq]=6&[code_contains]=F',
      'received-expenses/list?_limit=-1&_where[emitted_gte]=2025-04-01&[emitted_lte]=2025-06-30&[contact_eq]=336&[paid_date_null]=false&[serial_eq]=6&[code_contains]=F'
    ])
  })

  it('keeps the type and project filters', async () => {
    await ReceivedInvoicesTable.methods.getData.call(ctx({ documentType: 3, project: 626 }))
    expect(listCalls()).toEqual([
      'received-expenses/list?_limit=-1&_where[emitted_gte]=2025-01-01&[emitted_lte]=2025-12-31&[document_type_eq]=3&[projects_eq]=626'
    ])
  })
})
