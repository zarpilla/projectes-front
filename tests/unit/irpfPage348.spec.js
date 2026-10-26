// issues/348: an «IRPF» page like «IVA» but without settling: what is paid to
// Hisenda per quarter and the detail of every payroll, invoice and expense.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import IrpfTable from '@/components/IrpfTable.vue'
import { filterIrpfRows, irpfRowsTotals, kindLabel } from '@/domain/irpf.js'
import { canOpenPath } from '@/domain/routeAccess'
import menu from '@/service/menu'

const rows = [
  { key: 'payrolls:1', kind: 'payrolls', id: 1, code: '2026-01-anna', contact: 'anna', date: '2026-01-31', quarter: 1, base: 2000, irpf: 200, pct: 10, payment_date: '2026-04-20', paid: true, to: '/document/1/payrolls' },
  { key: 'received-invoices:5', kind: 'received-invoices', id: 5, code: 'F5', contact: 'Gestoria', date: '2026-02-10', quarter: 1, base: 1000, irpf: 150, pct: 15, payment_date: '2026-04-20', paid: true, to: '/document/5/received-invoices' },
  { key: 'received-expenses:9', kind: 'received-expenses', id: 9, code: 'L9', contact: 'Casa', document_type: 'Lloguer', date: '2026-05-01', quarter: 2, base: 500, irpf: 95, pct: 19, payment_date: '2026-07-20', paid: false, to: '/document/9/received-expenses' }
]
const answer = {
  year: 2026,
  totals: { total: 445, paid: 350, pending: 95, next: { date: '2026-07-20', amount: 95 } },
  quarters: [
    { year: 2026, quarter: 1, payrolls: 200, payrolls_count: 1, documents: 150, documents_count: 1, total: 350, payment_dates: ['2026-04-20'], paid: true },
    { year: 2026, quarter: 2, payrolls: 0, payrolls_count: 0, documents: 95, documents_count: 1, total: 95, payment_dates: ['2026-07-20'], paid: false }
  ],
  rows
}

beforeEach(() => {
  get.mockReset()
  get.mockResolvedValue({ data: answer })
})

describe('IRPF rows (issues/348)', () => {
  it('filters by quarter and origin and adds them up', () => {
    expect(filterIrpfRows(rows, { quarter: 1 }).map(r => r.id)).toEqual([1, 5])
    expect(filterIrpfRows(rows, { kind: 'payrolls' }).map(r => r.id)).toEqual([1])
    expect(filterIrpfRows(rows, { kind: 'documents' }).map(r => r.id)).toEqual([5, 9])
    expect(irpfRowsTotals(rows)).toEqual({ count: 3, base: 3500, irpf: 445 })
    expect(kindLabel(rows[2])).toBe('Despesa rebuda (Lloguer)')
  })

  it('has a menu entry under Diners, with the access of IVA', () => {
    const entries = menu.flat(2).filter(e => e && e.to)
    expect(entries.find(e => e.to === '/irpf')).toMatchObject({ label: 'IRPF', permission: 'projects' })
    expect(canOpenPath('/irpf', ['projects'])).toBe(canOpenPath('/iva', ['projects']))
    expect(canOpenPath('/irpf', ['orders'])).toBe(canOpenPath('/iva', ['orders']))
  })
})

describe('IRPF page (issues/348)', () => {
  const mountPage = async () => {
    const w = mount(IrpfTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    return w
  }

  it('shows the year, the quarters and every document, without settling', async () => {
    const w = await mountPage()
    expect(get.mock.calls[0][0]).toMatch(/^treasuries\/irpf\?year=\d{4}$/)
    const text = w.text()
    expect(text).toContain('445,00 €')
    expect(text).toContain('20/07/2026')
    expect(w.findAll('.irpf-table tbody tr')).toHaveLength(2)
    expect(w.findAll('.irpf-documents tbody tr')).toHaveLength(3)
    expect(text).toContain('Despesa rebuda (Lloguer)')
    expect(text).not.toMatch(/Salda/)
  })

  it('shows one quarter when it is clicked', async () => {
    const w = await mountPage()
    await w.findAll('.irpf-table tbody tr')[1].trigger('click')
    expect(w.findAll('.irpf-documents tbody tr')).toHaveLength(1)
    expect(w.find('.irpf-totals').text()).toContain('95,00 €')
  })
})
