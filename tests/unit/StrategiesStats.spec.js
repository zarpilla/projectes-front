// Informes › Estratègies: the tables above the pivot (mockup A-Informe-Estrategies)
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import StrategiesStats from '@/components/StrategiesStats.vue'

const s21 = { id: 3, code: '2.1', name: 'Acompanyament' }
const s22 = { id: 4, code: '2.2', name: 'Referents' }
const scope = { id: 10, name: 'Regions rurals', short_name: 'R' }
const project = (id, strategies, hours, balance) =>
  ({ id, name: `Projecte ${id}`, strategies, total_estimated_hours: hours, incomes_expenses: balance, project_scope: scope, project_state: { name: 'Actiu' } })

const projects = [
  project(1, [s21, s22], 1200, -1560.67),
  project(2, [], 10, 10),
  project(3, [], 10, 10),
  project(4, [], 10, 10),
  project(5, [], 10, 10)
]

const mountStats = async props => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }] })
  await router.push('/')
  return mount(StrategiesStats, { props, global: { plugins: [router] } })
}

describe('StrategiesStats', () => {
  it('shows the KPIs and the strategies of each line', async () => {
    const wrapper = await mountStats({ projects, strategies: [s21, s22, { id: 9, code: '1.3' }], stateName: null })
    const kpis = wrapper.findAll('.doc-kpi b').map(b => b.text())
    expect(kpis).toEqual(['1', '2 de 3', '1.200 h', '−1.560,67 €'])
    expect(wrapper.find('.st-line').text()).toContain('Línia 2')
    expect(wrapper.findAll('.st-table tbody tr').length).toBe(3)
    expect(wrapper.find('.notification').exists()).toBe(false)
  })

  it('folds a line', async () => {
    const wrapper = await mountStats({ projects })
    await wrapper.find('.st-tog').trigger('click')
    expect(wrapper.findAll('.st-table tbody tr').length).toBe(1)
  })

  it('lists the projects with their strategies', async () => {
    const wrapper = await mountStats({ projects })
    await wrapper.findAll('.segmented button')[1].trigger('click')
    const rows = wrapper.findAll('.st-table tbody tr')
    expect(rows.length).toBe(1)
    expect(rows[0].find('a').attributes('href')).toBe('/projecte/1')
    expect(rows[0].findAll('.tag').map(t => t.text())).toEqual(['2.1', '2.2'])
  })

  it('offers all the states when the chosen one has almost no strategies', async () => {
    const wrapper = await mountStats({ projects, stateName: 'Actiu' })
    expect(wrapper.find('.notification').text()).toContain('Només 1 dels 5 projectes en estat «actiu» té estratègies assignades.')
    await wrapper.find('.notification button').trigger('click')
    expect(wrapper.emitted('show-all')).toHaveLength(1)
  })

  it('colours the strategy × àmbit cells by the number of projects', async () => {
    const wrapper = await mountStats({ projects })
    const cells = wrapper.findAll('.st-hm')
    expect(cells.map(c => c.classes().find(k => /^st-h\d$/.test(k)))).toEqual(['st-h1', 'st-h1'])
  })
})
