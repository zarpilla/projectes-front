// issues/434 (Damià): Previsió econòmica.
// - In the chart, each colour of a bar says its own figure (hovering the
//   payroll part says «… € de nòmines», not the whole expenses), and an
//   expense part also says its share of the year's expenses.
// - «Resum per projectes» by «Tipus de projecte»: a type opens into its
//   projects; by «Àmbit»: a scope opens into its project types. Everything
//   folded at first, as in «Dedicació real».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { forecastRows, forecastChildRows } from '@/domain/forecastByProject.js'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => ({ treasury: [] })) }))
vi.mock('@/helpers/addScript', () => ({ loadKendo: vi.fn(), waitForJQuery: () => () => {} }))
import PrevisioTable from '@/components/PrevisioTable.vue'

const t = (id, name) => ({ id, name })
const y = (incomes, expenses, vat = 0) => ({ 2026: { forecast_incomes: incomes, forecast_expenses: expenses, forecast_expenses_vat: vat } })
const projects = [
  { id: 1, name: 'Caixa', project_type: t(1, 'Desenvolupament Bioregional'), project_scope: t(9, 'Rural'), years: y(1000, 100, 5) },
  { id: 2, name: 'Àgora', project_type: t(2, 'Consultoria'), project_scope: t(9, 'Rural'), years: y(200, 900, 50) },
  { id: 3, name: 'Bosc', project_type: t(1, 'Desenvolupament Bioregional'), project_scope: t(8, 'Ciutat'), years: y(500, 300, 0) },
  { id: 4, name: 'Pla', project_type: null, project_scope: t(9, 'Rural'), years: y(50, 0, 0) }
]
const labels = rows => rows.map(r => r.label)

describe('forecastChildRows (issues/434)', () => {
  it('a project type opens into its projects, adding up to the type', () => {
    const [bio] = forecastRows(projects, ['2026'], 'type')
    expect(bio.label).toBe('Desenvolupament Bioregional')
    const children = forecastChildRows(projects, ['2026'], 'type', bio.key)
    expect(labels(children)).toEqual(['Caixa', 'Bosc'])
    expect(children.every(c => c.projectId)).toBe(true)
    expect(children.reduce((a, c) => a + c.incomes, 0)).toBe(bio.incomes)
    expect(children.reduce((a, c) => a + c.payrollCover, 0)).toBe(bio.payrollCover)
  })

  it('a scope opens into its project types, not its projects', () => {
    const rural = forecastRows(projects, ['2026'], 'scope').find(r => r.label === 'Rural')
    const children = forecastChildRows(projects, ['2026'], 'scope', rural.key)
    expect(labels(children)).toEqual(['Desenvolupament Bioregional', 'Consultoria', 'Sense tipus'])
    expect(children.map(c => c.projects)).toEqual([1, 1, 1])
    expect(children.reduce((a, c) => a + c.invoices, 0)).toBe(rural.invoices)
  })

  it('«Sense tipus» opens into the projects without a type; nothing per project', () => {
    const none = forecastRows(projects, ['2026'], 'type').find(r => r.none)
    expect(labels(forecastChildRows(projects, ['2026'], 'type', none.key))).toEqual(['Pla'])
    expect(forecastChildRows(projects, ['2026'], 'project', 'p1')).toEqual([])
  })
})

describe('Previsió econòmica (issues/434)', () => {
  beforeEach(() => localStorage.clear())

  async function mountTable(vista = 'projectes') {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/previsio', component: { template: '<div/>' } },
        { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }
      ]
    })
    await router.push('/previsio?vista=' + vista)
    const w = mount(PrevisioTable, { global: { plugins: [createPinia(), Buefy, router], config: { warnHandler: () => {} } } })
    await w.setData({
      pivotData: [{ year: '2026', month: '00', forecast_incomes: 1750, forecast_expenses: -1355, forecast_amount: 395 }],
      forecastByProject: projects
    })
    await flushPromises()
    return w
  }
  const shown = w => w.findAll('.by-project-table tbody tr').map(tr => tr.find('th').text())

  it('chart: each colour its own figure, expenses with their share', async () => {
    const w = await mountTable('global')
    const year = { year: '2026', incomes: 1000, expenses: -783808.1, payroll: -461800.29, invoices: -300000, vat: -22007.81 }
    expect(w.vm.segmentTitle(year, 'payroll')).toBe('2026: −461.800,29 € de nòmines · 58,9 % de les despeses')
    expect(w.vm.segmentTitle(year, 'incomes')).toBe('2026: 1.000,00 € d\'ingressos')
    expect(w.find('.year-chart i.c-pay').attributes('title')).toContain('de nòmines')
  })

  it('by type: folded at first, a click opens the projects of that type', async () => {
    const w = await mountTable()
    await w.setData({ grouping: 'type' })
    expect(shown(w)).toEqual(['Desenvolupament Bioregional', 'Consultoria', 'Sense tipus'])
    await w.find('.by-project-table .group-toggle').trigger('click')
    expect(shown(w)).toEqual(['Desenvolupament Bioregional', 'Caixa', 'Bosc', 'Consultoria', 'Sense tipus'])
    await w.find('.by-project-table .group-toggle').trigger('click')
    expect(shown(w)).toEqual(['Desenvolupament Bioregional', 'Consultoria', 'Sense tipus'])
  })

  it('by scope: a scope opens into its types; changing grouping folds again', async () => {
    const w = await mountTable()
    await w.setData({ grouping: 'scope' })
    await w.findAll('.by-project-table .group-toggle')[0].trigger('click')
    expect(shown(w)).toEqual(['Rural', 'Desenvolupament Bioregional', 'Consultoria', 'Sense tipus', 'Ciutat'])
    await w.setData({ grouping: 'type' })
    await w.setData({ grouping: 'scope' })
    expect(shown(w)).toEqual(['Rural', 'Ciutat'])
  })
})
