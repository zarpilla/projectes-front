// The charts of Informes › Projectes read the same rows as its pivot (one per project)
import { describe, it, expect } from 'vitest'
import { projectFigures, totals, byResult, byHours, byGroup } from '@/domain/projectStatsCharts'

const project = (name, { scope = 'Estructura', leader = 'anna', inc = 0, incR = 0, res = 0, resR = 0, h = 0, hR = 0 } = {}) => ({
  project_name: name, project_scope: scope, project_leader: leader,
  incomes: inc, total_real_incomes: incR, incomes_expenses: res, total_real_incomes_expenses: resR,
  total_estimated_hours: h, hours: hR
})

const rows = [
  project('A', { inc: 1000, incR: 800, res: 300, resR: 100, h: 100, hR: 120 }),
  project('B', { scope: 'Logística', leader: 'joan', inc: 500, incR: 600, res: -50, resR: 200, h: 0, hR: 10 }),
  project('C', { scope: 'Logística', leader: '-', inc: 0, incR: 0, res: 0, resR: 0 })
]

describe('project stats charts', () => {
  it('reads a row with the pivot\'s measures', () => {
    expect(projectFigures(rows[0])).toEqual({ label: 'A', incomePlanned: 1000, incomeReal: 800, resultPlanned: 300, resultReal: 100, hoursPlanned: 100, hoursReal: 120 })
  })

  it('totals the projects', () => {
    expect(totals(rows)).toEqual({ projects: 3, incomePlanned: 1500, incomeReal: 1400, resultPlanned: 250, resultReal: 300, hoursPlanned: 100, hoursReal: 130 })
  })

  it('keeps the projects with a result, best real result first', () => {
    expect(byResult(rows).map(p => [p.label, p.resultReal])).toEqual([['B', 200], ['A', 100]])
    // the weight is the larger of the two results: A (300) before B (200)
    expect(byResult(rows, 1).map(p => p.label)).toEqual(['A'])
  })

  it('marks the projects past their planned hours', () => {
    expect(byHours(rows).map(p => [p.label, p.over])).toEqual([['A', true], ['B', false]])
  })

  it('groups by scope or by who leads, a missing one as «Sense»', () => {
    expect(byGroup(rows, 'project_scope').map(g => [g.label, g.projects, g.resultReal])).toEqual([['Estructura', 1, 100], ['Logística', 2, 200]])
    expect(byGroup(rows, 'project_leader').map(g => g.label)).toEqual(['anna', 'joan', 'Sense'])
  })
})
