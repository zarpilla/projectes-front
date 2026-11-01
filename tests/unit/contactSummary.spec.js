// «Resum» tab of a contact (decided 2026-10-30): figures of the selected
// (fiscal) year and of every year, document states, the filter chips.
import { describe, it, expect } from 'vitest'
import moment from 'moment'
import {
  ALL_YEARS, contactTab, showContactSummary, docStatus, isPending, periodYears, summaryFigures, hoursFigures, hoursProjectIds, projectFigures, filterDocuments
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
    expect(label(4)).toBe('No cobrat') // «Ingrés» is masculine
    expect(label(5)).toBe('Pagada')
    expect(label(6)).toBe('Pendent de pagar')
    expect(label(7)).toBe('Acceptat')
    expect(label(8)).toBe('Abonament')
    expect(docStatus({ kind: 'received-incomes', paid: true }, today).label).toBe('Cobrat')
    expect(docStatus({ kind: 'received-incomes', total: 5, paybefore: '2020-01-01' }, today).label).toBe('Vençut')
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

describe('hours', () => {
  const projects = [
    { id: 7, roles: ['client'] }, // mother of 8
    { id: 8, roles: ['documents'] }, // only an expense of the contact
    { id: 9, roles: ['documents'] }, // a sale of the contact
    { id: 10, roles: ['documents'] } // only an expense of the contact, no mother
  ]
  const hours = [
    { project: 7, projects: [7], date: '2026-02-01', hours: 10.5 },
    { project: 8, projects: [8, 7], date: '2026-09-01', hours: 4 },
    { project: 9, projects: [9], date: '2025-11-01', hours: 2.25 },
    { project: 10, projects: [10], date: '2026-03-01', hours: 100 },
    { project: 7, projects: [7], date: null, hours: 1 }
  ]

  it('counts client, intercooperation and sales projects, not a provider\'s', () => {
    expect([...hoursProjectIds(projects, docs)]).toEqual([7, 9])
    expect([...hoursProjectIds([{ id: 5, roles: ['intercooperation'] }], [])]).toEqual([5])
    // a draft is not a sale yet
    expect([...hoursProjectIds([{ id: 3, roles: ['documents'] }], [{ kind: 'emitted-invoices', state: 'draft', projects: [{ id: 3 }] }])]).toEqual([])
  })
  it('adds each row once, undated hours only in Històric', () => {
    expect(hoursFigures(hours, projects, docs, 2026)).toEqual({ hours: 14.5, hoursAll: 17.75 })
    expect(hoursFigures(hours, projects, docs, 2025).hours).toBe(2.25)
    expect(hoursFigures(hours, projects, docs, ALL_YEARS).hours).toBe(17.75)
  })
  it('follows the fiscal year', () => {
    // September–August: 2026-09 is 2026/27, 2026-02 and 2025-11 are 2025/26
    expect(hoursFigures(hours, projects, docs, 2025, 9).hours).toBe(12.75)
    expect(hoursFigures(hours, projects, docs, 2026, 9).hours).toBe(4)
  })
  it('shows them per project, a mother with those of its children', () => {
    const rows = projectFigures(projects, docs, 2026, 1, hours)
    expect(rows.map(r => [r.id, r.hours, r.childHours])).toEqual([
      [7, 14.5, true], [8, 0, false], [9, 0, false], [10, 0, false]
    ])
    expect(projectFigures(projects, docs, ALL_YEARS, 1, hours).find(r => r.id === 9).hours).toBe(2.25)
  })
  it('marks a mother whose child is not on the list', () => {
    const rows = projectFigures([{ id: 7, roles: ['client'] }], [], 2026, 1, [{ project: 99, projects: [7], date: '2026-01-01', hours: 3 }])
    expect(rows.map(r => [r.hours, r.childHours])).toEqual([[3, true]])
  })
  it('offers the years with hours', () => {
    expect(periodYears([], 1, today, [{ date: '2023-05-01' }, { date: null }])).toEqual([2026, 2023])
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
