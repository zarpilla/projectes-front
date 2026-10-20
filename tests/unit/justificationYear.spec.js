// issues/263 (review 8, 2026-10-20): Justificacions figures ignored or misused
// the chosen year:
//  - «Manuals previstes» summed every year's amount whatever the year;
//  - Previstes/Reals took the amount of the project's first row (one year's,
//    or none when the first row was a justification): with «Tots» 8 projects
//    were «Sense import»;
//  - invoice justifications have no month: «2025-null-01» had no year, so with
//    Any=2025 they disappeared (regression of the fiscal-year change).
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import Justification from '@/components/Justification.vue'

const projects = [
  {
    id: 1, name: 'ACTGI',
    grantable_years: [
      { year: { year: 2025 }, grantable_amount: 1000, grantable_structural_expenses_justify_invoices: 10 },
      { year: { year: 2026 }, grantable_amount: 500, grantable_structural_expenses_justify_invoices: 20 }
    ]
  },
  { id: 2, name: 'Einateca', grantable_years: [{ year: { year: 2026 }, grantable_amount: 300 }] }
]

// A component context: data, methods and computed (as getters) over `this`
function context (data) {
  const ctx = { theYear: 0, grantStartMonth: 1, projectState: null, type: 'Previstes', projects, justifications: [], payrolls: [], users: [], estimatedTotals: [], ...data }
  for (const [name, fn] of Object.entries(Justification.methods)) ctx[name] = fn.bind(ctx)
  for (const [name, fn] of Object.entries(Justification.computed)) {
    if (name in data) continue
    Object.defineProperty(ctx, name, { get: () => fn.call(ctx), configurable: true })
  }
  return ctx
}

describe('Justificacions follow the chosen year (issues/263)', () => {
  it('«Manuals previstes»: the chosen year only, all years with «Tots»', () => {
    const y2025 = context({ type: 'Manuals previstes', theYear: 2025 })
    expect(y2025.summaryByProjectAll.map(r => [r.project, r.grantable_amount])).toEqual([['ACTGI', 1000]])
    const none = context({ type: 'Manuals previstes', theYear: 2023 })
    expect(none.summaryByProjectAll).toEqual([])
    const all = context({ type: 'Manuals previstes', theYear: 0 })
    expect(all.summaryByProjectAll.map(r => [r.project, r.grantable_amount])).toEqual([['ACTGI', 1500], ['Einateca', 300]])
  })

  it('Previstes / Reals: the project amount, not the first row\'s', () => {
    const rows = [
      { project: 'ACTGI', cost: 100, grantable_amount: 0 },
      { project: 'Einateca', cost: 50, grantable_amount: 300 }
    ]
    const all = context({ theYear: 0, summaryByProject: rows, summaryJustificationsByProject: [{ project: 'ACTGI', cost: 7 }] })
    expect(all.summaryByProjectAll).toEqual([
      { project: 'ACTGI', cost: 107, grantable_amount: 1500 },
      { project: 'Einateca', cost: 50, grantable_amount: 300 }
    ])
    // a justification first: it has no amount
    const first = context({ theYear: 2025, summaryByProject: [], summaryJustificationsByProject: [{ project: 'ACTGI', cost: 7 }] })
    expect(first.summaryByProjectAll).toEqual([{ project: 'ACTGI', cost: 7, grantable_amount: 1000 }])
  })

  it('keeps invoice justifications without a month in their year', () => {
    const invoice = { id: 9, year: 2025, month: null, quantity: 50, emitted_invoice: { id: 3 }, project: { id: 1, name: 'ACTGI' } }
    const monthly = { id: 10, year: 2026, month: 3, quantity: 5, project: { id: 1, name: 'ACTGI' } }
    expect(context({ theYear: 2025 }).filterJustifications([invoice, monthly])).toEqual([invoice])
    expect(context({ theYear: 2026 }).filterJustifications([invoice, monthly])).toEqual([monthly])
    expect(context({ theYear: 0 }).filterJustifications([invoice, monthly])).toEqual([invoice, monthly])

    const ctx = context({ theYear: 2025, justifications: [invoice] })
    expect(ctx.summaryJustificationsInvoicesByProject).toEqual([{ project: 'ACTGI', cost: 50, grantable_amount: 10 }])
  })

  it('a fiscal grant year: the month decides, a month-less row keeps its year', () => {
    const ctx = context({ theYear: 2025, grantStartMonth: 9 })
    const rows = [
      { id: 1, year: 2025, month: 10, project: { id: 1 } },
      { id: 2, year: 2026, month: 3, project: { id: 1 } },
      { id: 3, year: 2026, month: 10, project: { id: 1 } },
      { id: 4, year: 2025, month: null, project: { id: 1 } },
      { id: 5, year: 2026, month: null, project: { id: 1 } }
    ]
    expect(ctx.filterJustifications(rows).map(j => j.id)).toEqual([1, 2, 4])
  })
})
