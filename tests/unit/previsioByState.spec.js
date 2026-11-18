// Raiels (2026-11-18): Previsió econòmica › «Resum per projectes» grouped by
// «Estat», the periodified projects in a group of their own («Periodificats»,
// after the states, whatever their state), and each group opens into its
// projects.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { GROUPINGS, forecastRows, forecastChildRows, forecastTotals, sortForecastRows } from '@/domain/forecastByProject.js'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => ({ treasury: [] })) }))
vi.mock('@/helpers/addScript', () => ({ loadKendo: vi.fn(), waitForJQuery: () => () => {} }))
import PrevisioTable from '@/components/PrevisioTable.vue'

const s = (id, name) => ({ id, name })
const y = (incomes, expenses, vat = 0) => ({ 2026: { forecast_incomes: incomes, forecast_expenses: expenses, forecast_expenses_vat: vat } })
const projects = [
  { id: 1, name: 'Caixa', project_state: s(1, 'Actiu'), periodified: false, years: y(1000, 100, 5) },
  { id: 2, name: 'Àgora', project_state: s(2, 'Presentat'), periodified: false, years: y(200, 900, 50) },
  { id: 3, name: 'Bosc', project_state: s(1, 'Actiu'), periodified: false, years: y(500, 300, 0) },
  { id: 4, name: 'Pla', project_state: s(1, 'Actiu'), periodified: true, years: y(5000, 0, 0) },
  { id: 5, name: 'Riu', project_state: s(3, 'Tancat'), periodified: true, years: y(70, 10, 0) },
  { id: 6, name: 'Orfe', project_state: null, periodified: false, years: y(10, 0, 0) }
]
const labels = rows => rows.map(r => r.label)

describe('forecastRows by state (Raiels)', () => {
  it('offers «Estat»', () => {
    expect(GROUPINGS.map(g => g.id)).toContain('state')
  })

  it('the states, then «Periodificats», then «Sense estat»; each project once', () => {
    const rows = forecastRows(projects, ['2026'], 'state')
    // Pla has the biggest incomes but goes with the periodified ones
    expect(labels(rows)).toEqual(['Actiu', 'Presentat', 'Periodificats', 'Sense estat'])
    expect(rows.map(r => r.projects)).toEqual([2, 1, 2, 1])
    const all = forecastTotals(forecastRows(projects, ['2026'], 'project'), 0)
    expect(forecastTotals(rows, 0)).toEqual(all)
  })

  it('a state and «Periodificats» open into their projects, adding up', () => {
    const rows = forecastRows(projects, ['2026'], 'state')
    const actiu = rows[0]
    const kids = forecastChildRows(projects, ['2026'], 'state', actiu.key)
    expect(labels(kids)).toEqual(['Caixa', 'Bosc'])
    expect(kids.reduce((a, c) => a + c.incomes, 0)).toBe(actiu.incomes)
    const per = rows.find(r => r.label === 'Periodificats')
    expect(labels(forecastChildRows(projects, ['2026'], 'state', per.key))).toEqual(['Pla', 'Riu'])
  })

  it('sorting keeps «Periodificats» and «Sense estat» last', () => {
    const rows = forecastRows(projects, ['2026'], 'state')
    expect(labels(sortForecastRows(rows, 'incomes', 'asc'))).toEqual(['Presentat', 'Actiu', 'Periodificats', 'Sense estat'])
    expect(labels(sortForecastRows(rows, 'label', 'desc'))).toEqual(['Presentat', 'Actiu', 'Periodificats', 'Sense estat'])
  })
})

describe('Previsió econòmica by state (Raiels)', () => {
  beforeEach(() => localStorage.clear())

  it('folded at first, a click opens the projects of the group', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/previsio', component: { template: '<div/>' } },
        { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }
      ]
    })
    await router.push('/previsio?vista=projectes')
    const w = mount(PrevisioTable, { global: { plugins: [createPinia(), Buefy, router], config: { warnHandler: () => {} } } })
    await w.setData({
      pivotData: [{ year: '2026', month: '00', forecast_incomes: 6780, forecast_expenses: -1365, forecast_amount: 5415 }],
      forecastByProject: projects,
      grouping: 'state'
    })
    await flushPromises()
    const shown = () => w.findAll('.by-project-table tbody tr').map(tr => tr.find('th').text())
    expect(shown()).toEqual(['Actiu', 'Presentat', 'Periodificats', 'Sense estat'])
    expect(w.find('.by-project-table tr.is-tail-group th').text()).toBe('Periodificats')
    await w.findAll('.by-project-table .group-toggle')[2].trigger('click')
    expect(shown()).toEqual(['Actiu', 'Presentat', 'Periodificats', 'Pla', 'Riu', 'Sense estat'])
    expect(w.findAll('.by-project-table tr.is-child a').map(a => a.text())).toEqual(['Pla', 'Riu'])
  })
})
