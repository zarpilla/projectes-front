// issues/368 (2026-10-30): Previsió econòmica › «Resum per projectes». The
// global figures per project (or project type / scope), and the payroll each
// project can cover: incomes minus the other expenses, 0 when negative,
// worked out per project and then added up. What they don't cover of the
// planned payroll is «Nòmines que falten per cobrir».
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { forecastRows, forecastTotals } from '@/domain/forecastByProject.js'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => ({ treasury: [] })) }))
vi.mock('@/helpers/addScript', () => ({ loadKendo: vi.fn(), waitForJQuery: () => () => {} }))
import PrevisioTable from '@/components/PrevisioTable.vue'

const type = { id: 4, name: 'Consultoria' }
const scope = { id: 9, name: 'Rural' }
const projects = [
  // covers 1000 − 400 − 42 = 558 in 2026
  { id: 1, name: 'A', project_type: type, project_scope: scope, years: { 2026: { forecast_incomes: 1000, forecast_expenses: 400, forecast_expenses_vat: 42 }, 2027: { forecast_incomes: 500, forecast_expenses: 0, forecast_expenses_vat: 0 } } },
  // loses money in 2026: covers 0, not −200
  { id: 2, name: 'B', project_type: type, project_scope: null, years: { 2026: { forecast_incomes: 100, forecast_expenses: 300, forecast_expenses_vat: 0 } } },
  { id: 3, name: 'C', project_type: null, project_scope: scope, years: { 2026: { forecast_incomes: 300, forecast_expenses: 100, forecast_expenses_vat: 0 } } },
  // nothing planned in 2026
  { id: 4, name: 'D', project_type: null, project_scope: null, years: { 2027: { forecast_incomes: 50, forecast_expenses: 0, forecast_expenses_vat: 0 } } }
]

describe('forecastRows (issues/368)', () => {
  it('per project: amounts with the global signs, the biggest incomes first', () => {
    const rows = forecastRows(projects, ['2026'], 'project')
    expect(rows.map(r => [r.label, r.incomes, r.invoices, r.vat, r.payrollCover])).toEqual([
      ['A', 1000, -400, -42, 558],
      ['C', 300, -100, 0, 200],
      ['B', 100, -300, 0, 0]
    ])
    expect(rows[0].projectId).toBe(1)
  })

  it('per type: the covers of each project added, not the group netted', () => {
    const rows = forecastRows(projects, ['2026'], 'type')
    expect(rows.map(r => [r.label, r.projects, r.incomes, r.payrollCover])).toEqual([
      ['Consultoria', 2, 1100, 558],
      ['Sense tipus', 1, 300, 200]
    ])
  })

  it('per scope, over several years', () => {
    const rows = forecastRows(projects, ['2026', '2027'], 'scope')
    expect(rows.map(r => [r.label, r.incomes, r.payrollCover])).toEqual([
      ['Rural', 1800, 1058 + 200],
      ['Sense àmbit', 150, 50]
    ])
  })

  it('leaves out what is missing and says what payroll is uncovered', () => {
    const rows = forecastRows(projects, ['2026'], 'project')
    const t = forecastTotals(rows, -1000)
    expect(t).toMatchObject({ incomes: 1400, invoices: -800, vat: -42, payrollCover: 758, payroll: -1000, payrollUncovered: 242, result: -442 })
    expect(forecastTotals(rows, -500).payrollUncovered).toBe(0)
  })
})

describe('Previsió econòmica tabs (issues/368)', () => {
  it('shows the summary per project on «Resum per projectes»', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/previsio', component: { template: '<div/>' } },
        { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }
      ]
    })
    await router.push('/previsio')
    const w = mount(PrevisioTable, { global: { plugins: [createPinia(), Buefy, router], config: { warnHandler: () => {} } } })
    await w.setData({
      pivotData: [{ year: '2026', month: '00', forecast_incomes: 1400, forecast_expenses: -1842, forecast_amount: -442 }],
      forecastByYear: { 2026: { forecast_incomes: 1400, forecast_expenses: 800, forecast_expenses_vat: 42 } },
      forecastPayrollsByYear: { 2026: 1000 },
      forecastByProject: projects
    })
    await flushPromises()
    expect(w.find('.by-project').exists()).toBe(false)

    await w.findAll('.forecast-tabs a')[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.vista).toBe('projectes')
    expect(w.find('.by-project').exists()).toBe(true)
    expect(w.findAll('.by-project-table tbody tr').map(tr => tr.find('th').text())).toEqual(['A', 'C', 'B'])
    expect(w.find('.by-project-table tr.is-uncovered').text()).toContain('Nòmines que falten per cobrir')
    expect(w.find('.by-project-table tr.is-uncovered').text()).toContain('242,00 €')
  })
})
