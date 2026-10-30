// «Resum» tab of a contact (decided 2026-10-30): figures of the selected
// (fiscal) year and of every year, document states, the filter chips.
import { describe, it, expect } from 'vitest'
import moment from 'moment'
import {
  ALL_YEARS, contactTab, showContactSummary, docStatus, isPending, periodYears, summaryFigures, projectFigures, filterDocuments
} from '@/domain/contactSummary'

const today = moment('2026-10-30')

const docs = [
  { id: 1, kind: 'emitted-invoices', emitted: '2026-03-01', total_base: 100.1, total: 121.12, paid_date: '2026-03-10', projects: [{ id: 7 }] },
  { id: 2, kind: 'emitted-invoices', emitted: '2026-09-15', total_base: 200.2, total: 242.24, paybefore: '2026-10-01', projects: [{ id: 7 }, { id: 9 }] },
  { id: 3, kind: 'emitted-invoices', emitted: '2026-10-20', total_base: 999, total: 999, state: 'draft' },
  { id: 4, kind: 'received-incomes', emitted: '2025-05-01', total_base: 50, total: 50, paybefore: '2026-12-01' },
  { id: 5, kind: 'received-invoices', emitted: '2026-02-01', total_base: 10, total: 12.1, paid: true },
  { id: 6, kind: 'received-expenses', emitted: '2025-11-01', total_base: 20, total: 20, projects: [{ id: 8 }] },
  { id: 7, kind: 'quotes', emitted: '2026-01-05', total_base: 1000, total: 1210, accepted: true },
  { id: 8, kind: 'emitted-invoices', emitted: '2026-04-01', total_base: -30, total: -36.3 }
]

describe('docStatus', () => {
  it('names the state like the document lists', () => {
    const label = id => docStatus(docs.find(d => d.id === id), today).label
    expect(label(1)).toBe('Cobrada')
    expect(label(2)).toBe('Vençuda')
    expect(label(3)).toBe('Esborrany')
    expect(label(4)).toBe('No cobrada')
    expect(label(5)).toBe('Pagada')
    expect(label(6)).toBe('Pendent de pagar')
    expect(label(7)).toBe('Acceptat')
    expect(label(8)).toBe('Abonament')
  })
  it('never counts a quote, a draft or a credit note as pending', () => {
    expect([3, 7, 8].map(id => isPending(docs.find(d => d.id === id)))).toEqual([false, false, false])
  })
})

describe('periodYears', () => {
  it('lists the current year and the years with documents, newest first', () => {
    expect(periodYears(docs, 1, today)).toEqual([2026, 2025])
  })
  it('uses the fiscal year when the entity has one', () => {
    // September–August: 2025-11-01 and 2026-03-01 are both 2025/26
    expect(periodYears(docs, 9, today)).toEqual([2026, 2025, 2024])
  })
})

describe('summaryFigures', () => {
  it('sums the year without VAT, drafts left out, and every year apart', () => {
    const f = summaryFigures(docs, 2026, 1, today)
    expect(f.sales).toBe(270.3) // 100.1 + 200.2 − 30, not the draft
    expect(f.salesAll).toBe(320.3)
    expect(f.purchases).toBe(10)
    expect(f.purchasesAll).toBe(30)
  })
  it('counts what is still to collect or pay whatever the year, with its VAT', () => {
    const f = summaryFigures(docs, 2025, 1, today)
    expect(f.toCollect).toBe(292.24)
    expect(f.toCollectCount).toBe(2)
    expect(f.overdueCount).toBe(1)
    expect(f.toPay).toBe(20)
    expect(f.toPayCount).toBe(1)
  })
  it('gives every year with Històric', () => {
    expect(summaryFigures(docs, ALL_YEARS, 1, today).sales).toBe(320.3)
  })
})

describe('projectFigures', () => {
  it('sums the contact documents of each project in the period', () => {
    const rows = projectFigures([{ id: 7 }, { id: 8 }, { id: 9 }], docs, 2026)
    expect(rows.map(r => [r.id, r.sales, r.purchases])).toEqual([[7, 300.3, 0], [8, 0, 0], [9, 200.2, 0]])
    expect(projectFigures([{ id: 8 }], docs, ALL_YEARS)[0].purchases).toBe(20)
  })
  it('counts a document shared between projects whole on each, and marks it', () => {
    const rows = projectFigures([{ id: 7 }, { id: 8 }], docs, 2026)
    expect(rows.map(r => r.shared)).toEqual([true, false])
  })
})

describe('filterDocuments', () => {
  const ids = list => list.map(d => d.id)
  it('filters by kind within the period', () => {
    expect(ids(filterDocuments(docs, 'all', 2025))).toEqual([4, 6])
    expect(ids(filterDocuments(docs, 'quotes', 2026))).toEqual([7])
    expect(ids(filterDocuments(docs, 'sales', 2026))).toEqual([1, 2, 3, 8])
    expect(ids(filterDocuments(docs, 'purchases', ALL_YEARS))).toEqual([5, 6])
  })
  it('shows every pending document whatever the year', () => {
    expect(ids(filterDocuments(docs, 'pending', 2026))).toEqual([2, 4, 6])
  })
})

describe('the «Resum» tab', () => {
  it('opens on «Resum» unless the URL asks for «Dades»', () => {
    expect(contactTab(undefined)).toBe('resum')
    expect(contactTab('dades')).toBe('dades')
    expect(contactTab('xyz')).toBe('resum')
  })
  it('is for a saved contact, for the office only', () => {
    expect(showContactSummary({ id: 3 }, ['projects'])).toBe(true)
    expect(showContactSummary({ id: 3 }, ['admin'])).toBe(true)
    expect(showContactSummary({ id: null }, ['projects'])).toBe(false)
    expect(showContactSummary({ id: 3 }, ['orders_admin', 'orders_delivery'])).toBe(false)
  })
  it('never shows on a delivery point (Diligència)', () => {
    expect(showContactSummary({ id: 3, owner: 9 }, ['projects', 'orders_admin'])).toBe(false)
  })
})
