// Informes › Previsió facturació: which planned incomes go to which month, and
// the figures of the KPIs, chart and per-person table.
import { describe, it, expect } from 'vitest'
import {
  addMonths, monthName, isGrant, filterRows, sections, byProject, byLeader, leaderCount,
  monthlyChart, lateness, closedPending, sumOf
} from '@/domain/invoicingForecast'

const row = (id, date, base, extra = {}) => ({
  id, date, base, total: base * 1.21, date_source: date ? 'invoice' : null,
  project_id: 1, project_name: 'A', state_id: 1, leader_id: 3, leader_name: 'Laia',
  client_name: null, income_type_name: 'Factura serveis 21%', ...extra
})
const TODAY = '2026-10-17'

describe('invoicing forecast', () => {
  it('steps months across years', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthName('2026-10')).toBe('octubre 2026')
  })

  it('leaves out grants and filters by state and person', () => {
    const rows = [
      row(1, '2026-10-31', 100),
      row(2, '2026-10-31', 100, { income_type_name: 'Subvenció pública' }),
      row(3, '2026-10-31', 100, { state_id: 3 }),
      row(4, '2026-10-31', 100, { leader_id: 9 })
    ]
    expect(isGrant(rows[1])).toBe(true)
    expect(filterRows(rows, { states: [1] }).map(r => r.id)).toEqual([1, 4])
    expect(filterRows(rows, { states: [1, 3], leaderId: 3 }).map(r => r.id)).toEqual([1, 3])
    expect(filterRows(rows).map(r => r.id)).toEqual([1, 3, 4])
  })

  it('splits rows into overdue, the months of the horizon, later and without date', () => {
    const s = sections([
      row(1, '2026-10-16', 10), // yesterday: overdue
      row(2, '2026-10-17', 20), // today: this month
      row(3, '2026-12-31', 30),
      row(4, '2027-01-01', 40), // beyond a 3-month horizon
      row(5, null, 50)
    ], TODAY, 3)
    expect(s.overdue.map(r => r.id)).toEqual([1])
    expect(s.months.map(m => [m.ym, m.rows.map(r => r.id)])).toEqual([['2026-10', [2]], ['2026-11', []], ['2026-12', [3]]])
    expect(s.later.map(r => r.id)).toEqual([4])
    expect(s.noDate.map(r => r.id)).toEqual([5])
    expect(sections([row(3, '2026-12-31', 30)], TODAY, 1).later).toHaveLength(1)
  })

  it('groups a project\'s lines with their dates, clients and totals', () => {
    const groups = byProject([
      row(1, '2026-07-15', 100.1, { client_name: 'Ateneu' }),
      row(2, '2026-05-01', 200.2, { date_source: 'payment', client_name: 'Ateneu' }),
      row(3, '2026-06-01', 5, { project_id: 2, project_name: 'B' }),
      row(4, null, 1, { project_id: 3, project_name: 'C' })
    ])
    expect(groups.map(g => g.project_name)).toEqual(['A', 'B', 'C'])
    expect(groups[0]).toMatchObject({ lines: 2, base: 300.3, first: '2026-05-01', last: '2026-07-15', clients: ['Ateneu'], fromPayment: 1 })
    expect(groups[2].first).toBe(null)
  })

  it('adds up the overdue per person, largest first', () => {
    expect(byLeader([
      row(1, '2026-01-01', 10),
      row(2, '2026-01-01', 15, { project_id: 2 }),
      row(3, '2026-01-01', 30, { leader_name: 'Pau' }),
      row(4, '2026-01-01', 1, { leader_name: null })
    ])).toEqual([
      { name: 'Pau', projects: 1, base: 30 },
      { name: 'Laia', projects: 2, base: 25 },
      { name: '—', projects: 1, base: 1, noLeader: true }
    ])
  })

  it('charts invoiced, overdue and planned per month, with the older overdue apart', () => {
    const c = monthlyChart([
      row(1, '2025-02-28', 7), // before the window
      row(2, '2026-07-15', 100),
      row(3, '2026-10-01', 10), // this month, already past
      row(4, '2026-10-31', 20),
      row(5, '2026-12-31', 30),
      row(6, '2027-01-31', 99) // beyond the horizon
    ], { '2026-07': 500, '2026-04': 1 }, TODAY, 3)
    expect(c.before).toBe(7)
    expect(c.months.map(m => m.ym)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'])
    expect(c.months[2]).toEqual({ ym: '2026-07', invoiced: 500, late: 100, planned: 0 })
    expect(c.months[5]).toEqual({ ym: '2026-10', invoiced: 0, late: 10, planned: 20 })
    expect(c.months[7].planned).toBe(30)
  })

  it('says how late a date is', () => {
    expect(lateness('2026-10-01', TODAY)).toEqual({ days: 16, text: 'fa 16 dies', level: 'warn' })
    expect(lateness('2026-07-15', TODAY)).toMatchObject({ text: 'fa 3 mesos', level: 'bad' })
    expect(lateness('2025-10-17', TODAY).text).toBe('fa 1 any')
    expect(lateness('2022-03-31', TODAY).text).toBe('fa 4 anys')
  })

  it('counts the planned incomes left in closed projects, without grants', () => {
    expect(closedPending([
      row(1, '2024-01-01', 10, { state_id: 2 }),
      row(2, null, 5, { state_id: 2, project_id: 2 }),
      row(3, null, 99, { state_id: 2, income_type_name: 'Subvenció privada' }),
      row(4, null, 1)
    ], [2])).toEqual({ projects: 2, lines: 2, base: 15 })
    expect(sumOf([row(1, null, 0.1), row(2, null, 0.2)])).toBe(0.3)
  })
})

// issues/128: «Endarrerit per responsable · 3 persones» counted the row of the
// projects without a responsible («—») as a person
describe('leaderCount (issues/128)', () => {
  it('counts people, not the «—» group', () => {
    const groups = byLeader([
      { project_id: 1, leader_name: 'Anna', base: 10 },
      { project_id: 2, leader_name: null, base: 5 },
      { project_id: 3, leader_name: 'Pau', base: 1 }
    ])
    expect(groups.find(g => g.name === '—').noLeader).toBe(true)
    expect(leaderCount(groups)).toBe(2)
  })
})
