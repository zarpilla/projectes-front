// issues/424 (2026-11-09): Previsió econòmica › «Resum per projectes». Every
// column can be sorted by clicking its header: names A→Z first, amounts the
// biggest first, a second click turns it round. «Sense tipus» / «Sense
// àmbit» stay last; the order holds when grouping by type or scope.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { forecastRows, sortForecastRows, defaultSortDir } from '@/domain/forecastByProject.js'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => ({ treasury: [] })) }))
vi.mock('@/helpers/addScript', () => ({ loadKendo: vi.fn(), waitForJQuery: () => () => {} }))
import PrevisioTable from '@/components/PrevisioTable.vue'

const t = (id, name) => ({ id, name })
const y = (incomes, expenses, vat = 0) => ({ 2026: { forecast_incomes: incomes, forecast_expenses: expenses, forecast_expenses_vat: vat } })
const projects = [
  { id: 1, name: 'Caixa', project_type: t(1, 'Formació'), project_scope: t(9, 'Rural'), years: y(1000, 100, 5) },
  { id: 2, name: 'àgora', project_type: t(2, 'Consultoria'), project_scope: null, years: y(200, 900, 50) },
  { id: 3, name: 'Bosc', project_type: null, project_scope: t(8, 'Ciutat'), years: y(500, 300, 0) },
  { id: 4, name: 'Projecte 10', project_type: t(1, 'Formació'), project_scope: t(8, 'Ciutat'), years: y(50, 0, 0) },
  { id: 5, name: 'Projecte 9', project_type: t(2, 'Consultoria'), project_scope: t(9, 'Rural'), years: y(60, 10, 0) }
]
const labels = (rows) => rows.map(r => r.label)

describe('sortForecastRows (issues/424)', () => {
  const rows = forecastRows(projects, ['2026'], 'project')

  it('names A→Z, accents and numbers as people read them', () => {
    expect(labels(sortForecastRows(rows, 'label', 'asc'))).toEqual(['àgora', 'Bosc', 'Caixa', 'Projecte 9', 'Projecte 10'])
    expect(labels(sortForecastRows(rows, 'label', 'desc'))).toEqual(['Projecte 10', 'Projecte 9', 'Caixa', 'Bosc', 'àgora'])
  })

  it('amounts the biggest first; expenses by their size, not their sign', () => {
    expect(labels(sortForecastRows(rows, 'incomes', 'desc'))).toEqual(['Caixa', 'Bosc', 'àgora', 'Projecte 9', 'Projecte 10'])
    expect(labels(sortForecastRows(rows, 'invoices', 'desc'))).toEqual(['àgora', 'Bosc', 'Caixa', 'Projecte 9', 'Projecte 10'])
    expect(labels(sortForecastRows(rows, 'vat', 'asc')).slice(-2)).toEqual(['Caixa', 'àgora'])
    expect(labels(sortForecastRows(rows, 'payrollCover', 'desc'))).toEqual(['Caixa', 'Bosc', 'Projecte 9', 'Projecte 10', 'àgora'])
  })

  it('first click: names ascending, amounts descending', () => {
    expect(defaultSortDir('label')).toBe('asc')
    expect(defaultSortDir('incomes')).toBe('desc')
  })

  it('by type or scope: the groups sorted, «Sense …» always last', () => {
    const byType = forecastRows(projects, ['2026'], 'type')
    expect(labels(sortForecastRows(byType, 'label', 'asc'))).toEqual(['Consultoria', 'Formació', 'Sense tipus'])
    expect(labels(sortForecastRows(byType, 'label', 'desc'))).toEqual(['Formació', 'Consultoria', 'Sense tipus'])
    const byScope = forecastRows(projects, ['2026'], 'scope')
    expect(labels(sortForecastRows(byScope, 'projects', 'desc'))).toEqual(['Ciutat', 'Rural', 'Sense àmbit'])
  })

  it('an unknown column keeps the order', () => {
    expect(sortForecastRows(rows, 'nope', 'asc')).toBe(rows)
  })
})

describe('«Resum per projectes» headers (issues/424)', () => {
  beforeEach(() => localStorage.clear())

  async function mountTable() {
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
      pivotData: [{ year: '2026', month: '00', forecast_incomes: 1810, forecast_expenses: -1365, forecast_amount: 445 }],
      forecastByProject: projects
    })
    await flushPromises()
    return w
  }
  const shown = (w) => w.findAll('.by-project-table tbody tr').map(tr => tr.find('th').text())
  const header = (w, text) => w.findAll('.by-project-table thead th').find(th => th.text().startsWith(text))

  it('click sorts, a second click turns round, and it is remembered', async () => {
    const w = await mountTable()
    expect(shown(w)).toEqual(['Caixa', 'Bosc', 'àgora', 'Projecte 9', 'Projecte 10'])

    await header(w, 'Projecte').find('button').trigger('click')
    expect(shown(w)).toEqual(['àgora', 'Bosc', 'Caixa', 'Projecte 9', 'Projecte 10'])
    expect(header(w, 'Projecte').attributes('aria-sort')).toBe('ascending')

    await header(w, 'Projecte').find('button').trigger('click')
    expect(shown(w)).toEqual(['Projecte 10', 'Projecte 9', 'Caixa', 'Bosc', 'àgora'])

    await header(w, 'Factures').find('button').trigger('click')
    expect(shown(w)[0]).toBe('àgora')
    expect(header(w, 'Factures').attributes('aria-sort')).toBe('descending')

    w.unmount()
    const again = await mountTable()
    expect(shown(again)[0]).toBe('àgora')
  })

  it('the name order holds when grouping by type', async () => {
    const w = await mountTable()
    await header(w, 'Projecte').find('button').trigger('click')
    await w.setData({ grouping: 'type' })
    expect(shown(w)).toEqual(['Consultoria', 'Formació', 'Sense tipus'])
    await header(w, 'Projectes').find('button').trigger('click')
    expect(shown(w)).toEqual(['Consultoria', 'Formació', 'Sense tipus'])
    expect(header(w, 'Projectes').attributes('aria-sort')).toBe('descending')
  })
})
