// Informes › Estratègies: KPIs, strategies per line and the strategy × àmbit map
import { describe, it, expect } from 'vitest'
import { lineOf, strategyName, strategyStats, strategyProjects, strategyMatrix, heatLevel } from '@/domain/strategyStats'

const s11 = { id: 1, code: '1.1', name: 'Governança' }
const s12 = { id: 2, code: '1.2', name: 'Ingressos' }
const s21 = { id: 3, code: '2.1', name: 'Acompanyament' }
const s210 = { id: 4, code: '2.10', name: 'Desena' }
const hubs = { id: 5, code: 'Hubs', name: null }
const unused = { id: 6, code: '1.3', name: 'Sense projectes' }

const scopeR = { id: 10, name: 'Regions rurals', short_name: 'R' }
const scopeE = { id: 11, name: 'Entitats', short_name: 'E' }

const project = (id, strategies, { hours = 0, balance = 0, scope = null, state = 'Tancat' } = {}) => ({
  id, name: `P${id}`, strategies, total_estimated_hours: hours, incomes_expenses: balance,
  project_scope: scope, project_state: { name: state }
})

const projects = [
  project(1, [s11, s21], { hours: 100, balance: 1000, scope: scopeR }),
  project(2, [s12], { hours: '50.5', balance: '-200.25', scope: scopeE }),
  project(3, [s21, s210], { hours: 10, balance: 0, scope: scopeR }),
  project(4, [hubs], { hours: 5, balance: 5 }),
  project(5, [], { hours: 999, balance: 999 }),
  project(6, undefined, { hours: 1, balance: 1 })
]

describe('strategy stats', () => {
  it('takes the line from the code before the dot', () => {
    expect(lineOf('2.1')).toBe('2')
    expect(lineOf(' 10.3')).toBe('10')
    expect(lineOf('ARTTERRA')).toBe('Altres')
    expect(lineOf(null)).toBe('Altres')
  })

  it('names a strategy without a name by its code', () => {
    expect(strategyName(hubs)).toBe('Hubs')
    expect(strategyName({ code: 'X', name: '  ' })).toBe('X')
    expect(strategyName(s11)).toBe('Governança')
  })

  it('counts each project once in the totals and the line subtotals', () => {
    const stats = strategyStats(projects, [s11, s12, s21, s210, hubs, unused])
    expect(stats.total).toBe(6)
    expect(stats.projects).toBe(4)
    expect(stats.hours).toBe(165.5)
    expect(stats.balance).toBeCloseTo(804.75, 2)
    expect(stats.used).toBe(5)
    expect(stats.available).toBe(6)
    expect(stats.unused.map(s => s.code)).toEqual(['1.3'])

    expect(stats.lines.map(l => [l.label, l.projects, l.hours])).toEqual([
      ['Línia 1', 2, 150.5],
      ['Línia 2', 2, 110],
      ['Altres', 1, 5]
    ])
    // 2.10 after 2.1 (numeric order), bars relative to the strategy with most projects
    expect(stats.lines[1].strategies.map(s => [s.code, s.projects, s.hours, s.share])).toEqual([
      ['2.1', 2, 110, 1],
      ['2.10', 1, 10, 0.5]
    ])
  })

  it('without the full list, the strategies in use are all there are', () => {
    const stats = strategyStats(projects)
    expect(stats.available).toBe(5)
    expect(stats.unused).toEqual([])
  })

  it('is empty without projects', () => {
    expect(strategyStats([], [s11])).toMatchObject({ total: 0, projects: 0, hours: 0, balance: 0, used: 0, available: 1, lines: [] })
  })

  it('lists the projects with strategies, most hours first', () => {
    const rows = strategyProjects(projects)
    expect(rows.map(r => r.id)).toEqual([1, 2, 3, 4])
    expect(rows[2].strategies.map(s => s.code)).toEqual(['2.1', '2.10'])
    expect(rows[3]).toMatchObject({ scope: '', state: 'Tancat', hours: 5 })
  })

  it('counts projects per strategy and àmbit, «Sense àmbit» last', () => {
    const { scopes, rows } = strategyMatrix(projects)
    expect(scopes.map(s => s.name)).toEqual(['Entitats', 'Regions rurals', 'Sense àmbit'])
    expect(rows.map(r => [r.code, r.cells, r.total])).toEqual([
      ['1.1', [0, 1, 0], 1],
      ['1.2', [1, 0, 0], 1],
      ['2.1', [0, 2, 0], 2],
      ['2.10', [0, 1, 0], 1],
      ['Hubs', [0, 0, 1], 1]
    ])
  })

  it('steps the heat map at 1, 2–3, 4–6 and 7 or more', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 30].map(heatLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4])
  })
})
