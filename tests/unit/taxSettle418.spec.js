// issues/418 (2026-11-09): «IVA» laid out like «IRPF»: a year, several
// quarters at once, the documents settled or pending, and «Salda» adds up the
// documents ticked, not the ones the filter shows.
// issues/419: «IRPF» gets «Salda»: the documents ticked are settled on a date.
// (issues/209, was vatDocumentsBase.spec.js: the base, not the total; the
// deductible % only on supported VAT.)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => ({ vat_expected: { paid: 0, received: 0, documents: [] }, vat_expected_by_quarter: {} })) }))

import VatTable from '@/components/VatTable.vue'
import IrpfTable from '@/components/IrpfTable.vue'
import {
  quartersFromQuery, toggleQuarter, quartersLabel, filterByQuartersAndStatus, settlePayload, vatTotals, irpfTotals,
  VAT_KINDS, IRPF_KINDS
} from '@/domain/taxSettle.js'

const vatRow = (id, kind, quarter, vat, extra = {}) => {
  const supported = kind === 'received-invoices' || kind === 'received-expenses'
  const deductible = supported ? vat * 0.5 : 0
  return {
    key: `${kind}:${id}`, kind, id, code: `D${id}`, contact: 'Coop', document_type: null,
    date: `2026-0${quarter * 3 - 1}-10`, year: 2026, quarter, supported,
    base: vat * 5, vat, deductible_pct: supported ? 50 : null, deductible, balance: supported ? deductible : -vat,
    settled: false, settled_date: null, to: `/document/${id}/${kind}`, ...extra
  }
}

const VAT_ROWS = [
  vatRow(1, 'emitted-invoices', 1, 210, { settled: true, settled_date: '2026-04-18' }),
  vatRow(2, 'received-invoices', 1, 100),
  vatRow(3, 'emitted-invoices', 2, 42),
  vatRow(4, 'received-expenses', 3, 20),
  vatRow(5, 'received-incomes', 3, 10)
]
const VAT_ANSWER = {
  year: 2026,
  totals: { count: 5, received: 262, paid: 120, deductible_paid: 60, balance: -202, pending_count: 4, pending_balance: 8 },
  quarters: [
    { year: 2026, quarter: 1, count: 2, received: 210, paid: 100, deductible_paid: 50, balance: -160, pending_count: 1, pending_balance: 50, status: 'partial', payment_date: '2026-04-20' },
    { year: 2026, quarter: 2, count: 1, received: 42, paid: 0, deductible_paid: 0, balance: -42, pending_count: 1, pending_balance: -42, status: 'pending', payment_date: '2026-07-20' },
    { year: 2026, quarter: 3, count: 2, received: 10, paid: 20, deductible_paid: 10, balance: 0, pending_count: 2, pending_balance: 0, status: 'pending', payment_date: '2026-10-20' }
  ],
  rows: VAT_ROWS,
  earlier_pending: { count: 2, balance: -31, years: [2025] }
}

describe('quarters and selection (issues/418)', () => {
  it('reads one or several quarters from the URL', () => {
    expect(quartersFromQuery('3')).toEqual([3])
    expect(quartersFromQuery('4,1,9')).toEqual([1, 4])
    expect(quartersFromQuery(undefined)).toEqual([])
  })

  it('adds and takes out quarters', () => {
    expect(toggleQuarter([], 3)).toEqual([3])
    expect(toggleQuarter([3], 1)).toEqual([1, 3])
    expect(toggleQuarter([1, 3], 3)).toEqual([1])
    expect(quartersLabel([1, 2, 4])).toBe('T1, T2 i T4')
  })

  it('filters by several quarters and by state', () => {
    expect(filterByQuartersAndStatus(VAT_ROWS, { quarters: [1, 3] }).map(r => r.id)).toEqual([1, 2, 4, 5])
    expect(filterByQuartersAndStatus(VAT_ROWS, { status: 'settled' }).map(r => r.id)).toEqual([1])
    expect(filterByQuartersAndStatus(VAT_ROWS, { quarters: [1], status: 'pending' }).map(r => r.id)).toEqual([2])
  })

  it('sends only the pending documents ticked, each to its list', () => {
    expect(settlePayload(VAT_ROWS, VAT_KINDS)).toEqual({
      emittedInvoices: [3], receivedIncomes: [5], receivedInvoices: [2], receivedExpenses: [4]
    })
    expect(settlePayload([{ kind: 'payrolls', id: 7, paid: false }, { kind: 'received-invoices', id: 8, paid: true }], IRPF_KINDS))
      .toEqual({ receivedInvoices: [], receivedExpenses: [], payrolls: [7] })
  })

  it('adds up the VAT and the IRPF of a selection', () => {
    expect(vatTotals(VAT_ROWS.slice(1, 3))).toEqual({ count: 2, received: 42, paid: 100, deductible_paid: 50, balance: 8 })
    expect(irpfTotals([{ base: 100, irpf: 15 }, { base: 50.1, irpf: 7.5 }])).toEqual({ count: 2, base: 150.1, irpf: 22.5 })
  })
})

const mountWith = async (Component, query = {}) => {
  const w = mount(Component, {
    global: {
      plugins: [Buefy],
      mocks: { $route: { query } },
      stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } }
    }
  })
  await flushPromises()
  return w
}

describe('IVA page (issues/418)', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockImplementation(async url => (url === 'me'
      ? { data: { options: { deductible_vat_pct: 100 } } }
      : { data: VAT_ANSWER }))
    post.mockResolvedValue({ data: { done: true } })
  })

  const docRows = w => w.findAll('.vat-documents tbody tr')
  const tick = async (w, id) => {
    const row = docRows(w).find(r => r.find(`a[href="/document/${id}/${VAT_ROWS.find(d => d.id === id).kind}"]`).exists())
    await row.find('td.checkbox-cell .checkbox').trigger('click')
  }

  it('reads the year from GET treasuries/vat and lists every document with its state', async () => {
    const w = await mountWith(VatTable)
    expect(get.mock.calls.map(c => c[0])).toContain(`treasuries/vat?year=${new Date().getFullYear()}`)
    expect(w.findAll('.vat-quarter-table tbody tr')).toHaveLength(3)
    expect(docRows(w)).toHaveLength(5)
    const text = w.text()
    expect(text).toContain('Saldat 18/04/2026')
    expect(text).toContain('Parcial')
    // documents of 2025 still pending
    expect(text).toMatch(/2 documents de 2025 tenen l'IVA pendent de saldar/)
    // issues/209: the base, and the % only on supported VAT
    expect(docRows(w)[0].text()).toContain('1.050,00 €')
    expect(docRows(w)[0].text()).toContain('—')
  })

  it('shows the documents of several quarters at once', async () => {
    const w = await mountWith(VatTable)
    const quarters = w.findAll('.vat-quarter-table tbody tr')
    await quarters[0].trigger('click')
    await quarters[2].trigger('click')
    expect(docRows(w)).toHaveLength(4)
    expect(w.text()).toContain('Documents del T1 i T3')
    // or from the quarter buttons
    await w.findAll('.quarter-toggle button').find(b => b.text() === 'T2').trigger('click')
    expect(w.findAll('.quarter-toggle button[aria-pressed="true"]').map(b => b.text())).toEqual(['T1', 'T2', 'T3'])
  })

  it('a settled document cannot be ticked', async () => {
    const w = await mountWith(VatTable)
    expect(docRows(w)[0].find('td.checkbox-cell input').attributes('disabled')).toBeDefined()
  })

  it('«Salda» adds up the documents ticked, whatever the filter, and settles only them', async () => {
    const w = await mountWith(VatTable)
    await tick(w, 2) // T1 supported: +50
    const quarters = w.findAll('.vat-quarter-table tbody tr')
    await quarters[1].trigger('click') // only T2 now: document 2 is out of the list…
    await tick(w, 3) // T2 charged: −42
    const bar = w.find('.settle-bar')
    // …but still ticked and added up
    expect(bar.text()).toContain('2 documents')
    expect(bar.text()).toContain('1 fora del filtre')
    expect(bar.text()).toContain('Saldo a favor')
    expect(bar.text()).toContain('8,00 €')
    // the list's totals are the filter's, apart
    expect(w.find('.vat-totals').text()).toMatch(/Saldo\s*[-−]42,00 €/)

    await bar.findAll('button').find(b => b.text().startsWith('Salda')).trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('emitted-invoices/pay-vat-ids', expect.objectContaining({
      emittedInvoices: [3], receivedInvoices: [2], receivedIncomes: [], receivedExpenses: []
    }))
    expect(post.mock.calls[0][1].vat_paid_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // reloaded, nothing ticked
    expect(get.mock.calls.filter(c => c[0].startsWith('treasuries/vat')).length).toBe(2)
    expect(w.find('.settle-bar').text()).toContain('Marca els documents pendents')
  })

  it('ticks every pending document of the list at once', async () => {
    const w = await mountWith(VatTable)
    await w.findAll('.vat-quarter-table tbody tr')[2].trigger('click') // T3
    await w.find('.settle-bar').findAll('button').find(b => b.text().includes('Marca els pendents')).trigger('click')
    expect(w.find('.settle-bar').text()).toContain('2 documents')
  })

  it('offers no «Salda» without a deductible % in Configuració (as the API)', async () => {
    get.mockImplementation(async url => (url === 'me' ? { data: { options: {} } } : { data: VAT_ANSWER }))
    const w = await mountWith(VatTable)
    expect(w.find('.settle-bar').exists()).toBe(false)
    expect(w.find('.vat-documents td.checkbox-cell').exists()).toBe(false)
  })

  it('keeps the forecast in «Previst»', async () => {
    const w = await mountWith(VatTable)
    await w.findAll('.vat-views button').find(b => b.text() === 'Previst').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Trimestres previstos')
    expect(w.find('.vat-documents').exists()).toBe(false)
  })
})

describe('IRPF «Salda» (issues/419)', () => {
  const irpfRows = [
    { key: 'payrolls:1', kind: 'payrolls', id: 1, code: '2026-01-anna', contact: 'anna', date: '2026-01-31', quarter: 1, base: 2000, irpf: 200, pct: 10, deadline: '2026-04-20', payment_date: '2026-04-18', paid: true, settled_date: '2026-04-18', to: '/document/1/payrolls' },
    { key: 'received-invoices:5', kind: 'received-invoices', id: 5, code: 'F5', contact: 'Gestoria', date: '2026-02-10', quarter: 1, base: 1000, irpf: 150, pct: 15, deadline: '2026-04-20', payment_date: '2026-10-20', paid: false, late: true, to: '/document/5/received-invoices' },
    { key: 'received-expenses:9', kind: 'received-expenses', id: 9, code: 'L9', contact: 'Casa', document_type: 'Lloguer', date: '2026-05-01', quarter: 2, base: 500, irpf: 95, pct: 19, deadline: '2026-07-20', payment_date: '2026-07-20', paid: false, to: '/document/9/received-expenses' }
  ]
  const answer = {
    year: 2026,
    totals: { total: 445, paid: 200, pending: 245, pending_count: 2, late: 150, next: { date: '2026-07-20', amount: 245 } },
    quarters: [
      { year: 2026, quarter: 1, payrolls: 200, payrolls_count: 1, documents: 150, documents_count: 1, total: 350, settled: 200, pending: 150, status: 'partial', deadline: '2026-04-20', payment_dates: [] },
      { year: 2026, quarter: 2, payrolls: 0, payrolls_count: 0, documents: 95, documents_count: 1, total: 95, settled: 0, pending: 95, status: 'pending', deadline: '2026-07-20', payment_dates: [] }
    ],
    rows: irpfRows,
    earlier_pending: { count: 0, amount: 0, years: [] }
  }

  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue({ data: answer })
    post.mockResolvedValue({ data: { count: 2, total: 245, settled: {} } })
  })

  it('shows what is settled, pending, and late (into the next declaration)', async () => {
    const w = await mountWith(IrpfTable)
    const text = w.text()
    expect(text).toContain('Parcial')
    expect(text).toContain('Pendent, fora de termini')
    expect(text).toContain('150,00 € fora de termini')
    expect(w.findAll('.irpf-documents tbody tr')[0].find('td.checkbox-cell input').attributes('disabled')).toBeDefined()
  })

  it('settles the documents ticked, from several quarters, on the date chosen', async () => {
    const w = await mountWith(IrpfTable)
    const quarters = w.findAll('.irpf-table tbody tr')
    await quarters[0].trigger('click')
    await quarters[1].trigger('click')
    expect(w.text()).toContain('Detall del T1 i T2')
    await w.find('.settle-bar').findAll('button').find(b => b.text().includes('Marca els pendents')).trigger('click')
    const bar = w.find('.settle-bar')
    expect(bar.text()).toContain('2 documents')
    expect(bar.text()).toContain('245,00 €')
    await bar.findAll('button').find(b => b.text().startsWith('Salda')).trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('treasuries/irpf/settle', expect.objectContaining({
      receivedInvoices: [5], receivedExpenses: [9], payrolls: []
    }))
    expect(post.mock.calls[0][1].irpf_paid_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('a document left out stays pending', async () => {
    const w = await mountWith(IrpfTable)
    const rows = w.findAll('.irpf-documents tbody tr')
    await rows[2].find('td.checkbox-cell .checkbox').trigger('click')
    await w.find('.settle-bar').findAll('button').find(b => b.text().startsWith('Salda')).trigger('click')
    await flushPromises()
    expect(post.mock.calls[0][1]).toMatchObject({ receivedInvoices: [], receivedExpenses: [9] })
  })
})
