// The charts of Informes › Dedicació add up the same rows as its pivot:
// logged hours (hours, real_cost) and planned hours (estimated_hours…)
import { describe, it, expect } from 'vitest'
import { totals, byPeriod, byGroup, workedShare } from '@/domain/dedicationEstCharts'

const logged = (project, username, month, hours, cost = hours * 20) => ({ project_name: project, username, year: '2026', month, hours, real_cost: cost })
const planned = (project, username, month, h, today = h, original = h) => ({ project_name: project, username, year: '2026', month, hours: 0, estimated_hours: h, estimated_hours_today: today, original_estimated_hours: original, real_cost: 0 })

const rows = [
  planned('A', 'anna', '01', 40),
  logged('A', 'anna', '01', 50),
  planned('A', 'joan', '02', 30, 10),
  logged('B', 'joan', '02', 5),
  logged('B', '-', '03', 2)
]

describe('dedication forecast charts', () => {
  it('totals planned, planned up to today, worked and their cost', () => {
    expect(totals(rows)).toEqual({ planned: 70, plannedToday: 50, original: 70, worked: 57, cost: 1140, deviation: 7 })
  })

  it('splits a year by month, with both accumulated', () => {
    const months = byPeriod(rows)
    expect(months).toHaveLength(12)
    expect(months.slice(0, 3).map(m => [m.label, m.planned, m.worked, m.plannedAccumulated, m.workedAccumulated])).toEqual([
      ['Gen', 40, 50, 40, 50],
      ['Febr', 30, 5, 70, 55],
      ['Març', 0, 2, 70, 57]
    ])
  })

  it('splits several years by year', () => {
    const years = byPeriod([...rows, { ...logged('C', 'anna', '05', 8), year: '2025' }], { byYear: true })
    expect(years.map(y => [y.label, y.worked])).toEqual([['2025', 8], ['2026', 57]])
  })

  it('groups by person or project, most hours first, marking who passes the plan', () => {
    expect(byGroup(rows, 'username').map(g => [g.label, g.planned, g.worked, g.over])).toEqual([
      ['anna', 40, 50, true],
      ['joan', 30, 5, false],
      ['Sense assignar', 0, 2, false]
    ])
    expect(byGroup(rows, 'project_name', 1).map(g => g.label)).toEqual(['A'])
  })

  it('splits the worked hours by type, the ones without one as «Sense assignar»', () => {
    const typed = [
      { ...logged('A', 'anna', '01', 6), activity_type: 'Gestió' },
      { ...logged('A', 'anna', '01', 3), activity_type: 'Formació' },
      { ...logged('A', 'anna', '01', 1), activity_type: '-' },
      planned('A', 'anna', '01', 40)
    ]
    expect(workedShare(typed, 'activity_type')).toEqual([
      { label: 'Gestió', worked: 6, share: 0.6 },
      { label: 'Formació', worked: 3, share: 0.3 },
      { label: 'Sense assignar', worked: 1, share: 0.1 }
    ])
    expect(workedShare(typed, 'activity_type', 2).map(g => [g.label, g.worked])).toEqual([['Gestió', 6], ['Altres', 4]])
  })
})
