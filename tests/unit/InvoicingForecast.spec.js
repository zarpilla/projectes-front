// Informes › Previsió facturació: the page starts on the active projects, the state
// chips add other states (as in Tresoreria), and grants never show.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const states = [{ id: 1, name: 'Actiu' }, { id: 2, name: 'Tancat' }, { id: 3, name: 'Sol·licitat' }]
const row = (id, date, base, extra = {}) => ({
  id, date, base, total: base, vat_pct: 0, date_source: date ? 'invoice' : null, concept: `Línia ${id}`,
  project_id: id, project_name: `Projecte ${id}`, state_id: 1, leader_id: 4, leader_name: 'Laia', income_type_name: 'Factura', ...extra
})
const forecast = {
  today: '2026-10-17',
  invoiced_by_month: { '2026-07': 500 },
  rows: [
    row(1, '2026-07-15', 100),
    row(2, '2026-10-31', 200),
    row(3, '2026-11-15', 300, { state_id: 3 }),
    row(4, '2026-11-15', 400, { income_type_name: 'Subvenció pública' }),
    row(5, '2025-01-01', 50, { state_id: 2 })
  ]
}
const api = {
  get: vi.fn(async url => ({ data: url.startsWith('project-states') ? states : forecast }))
}
vi.mock('@/service/index', () => ({ default: () => api }))
import InvoicingForecast from '@/views/InvoicingForecast.vue'

async function mountPage () {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }
    ]
  })
  await router.push('/')
  const errors = []
  const w = mount(InvoicingForecast, {
    global: {
      plugins: [createPinia(), Buefy, router],
      stubs: { TitleBar: true, DownloadExcel: { template: '<div><slot/></div>' } },
      config: { errorHandler: err => errors.push(err), warnHandler: () => {} }
    }
  })
  await flushPromises()
  return { w, errors }
}

const projectLinks = w => w.findAll('a.if-project').map(a => a.text())

describe('Previsió facturació page', () => {
  beforeEach(() => localStorage.clear())

  it('opens on the active projects: overdue and this month, no grants', async () => {
    const { w, errors } = await mountPage()
    expect(errors).toEqual([])
    expect(projectLinks(w)).toEqual(['Projecte 1', 'Projecte 2'])
    expect(w.text()).toContain('Endarrerit')
    expect(w.text()).toContain('Projectes tancats amb ingressos sense factura')
    expect(w.text()).not.toContain('Projecte 4')
  })

  it('adds a state with its chip, as in Tresoreria', async () => {
    const { w } = await mountPage()
    const chip = w.findAll('button.chip-toggle').find(b => b.text() === 'Sol·licitat')
    await chip.trigger('click')
    // November is collapsed by default: open it
    const nov = w.findAll('button.if-toggle').find(b => b.text().startsWith('Novembre 2026'))
    await nov.trigger('click')
    expect(projectLinks(w)).toContain('Projecte 3')
    expect(JSON.parse(localStorage.getItem('InvoicingForecast.selectedStates'))).toEqual([1, 3])
  })

  it('links each project to its budget tab', async () => {
    const { w } = await mountPage()
    expect(w.find('a.if-project').attributes('href')).toBe('/projecte/1?tab=pressupost')
  })
})
