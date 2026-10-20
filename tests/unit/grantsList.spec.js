// issues/086: Subvencions sorted «Òrgan convocant» by a field it didn't show,
// printed ISO dates and empty amounts as 0,00.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const projects = [
  { id: 1, name: 'Ajuda A', clients: [{ name: 'Ajuntament' }], justification_date: '2026-03-05', grantable_amount_total: null, project_state: { id: 1 } },
  { id: 2, name: 'Ajuda B', clients: [], grantable_amount_total: 1200, project_state: { id: 1 } }
]
const get = vi.fn(async url => ({ data: url.startsWith('project-states') ? [{ id: 1, name: 'Actiu' }] : projects }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import Grants from '@/views/Grants.vue'

describe('Subvencions list (issues/086)', () => {
  it('shows the organ it sorts by, Catalan dates and «—» for missing values', async () => {
    const w = mount(Grants, {
      global: { plugins: [createPinia(), Buefy], stubs: { 'router-link': { template: '<a><slot /></a>' }, 'title-bar': true, 'download-excel': true } }
    })
    await flushPromises()
    const rowOf = name => w.findAll('tbody tr').find(r => r.text().includes(name))
    const a = rowOf('Ajuda A')
    expect(a.text()).toContain('Ajuntament')
    expect(a.text()).toContain('05/03/2026')
    expect(a.text()).not.toContain('2026-03-05')
    expect(a.text()).not.toContain('0,00')
    expect(a.text()).not.toMatch(/\s–\s/)
    expect(w.vm.tableRows.find(r => r.id === 1).organ).toBe('Ajuntament')
  })
})

// issues/262: Subvencions read the old project fields (grantable_amount_total,
// grantable_cofinancing), which the fitxa no longer edits, instead of «Imports
// per any» (grantable_years): «falta import» for projects with amounts.
describe('Subvencions amounts per year (issues/262)', () => {
  it('sums «Imports per any» and asks for the per-year amounts', async () => {
    get.mockClear()
    projects.splice(0, projects.length,
      {
        id: 268, name: 'Enfortim', clients: [{ name: 'Generalitat' }], justification_date: '2026-12-01',
        grantable_amount_total: null, grantable_cofinancing: null, project_state: { id: 1 },
        grantable_years: [
          { year: { year: 2025 }, grantable_amount_total: 1000, grantable_amount: 800, grantable_cofinancing: 100 },
          { year: { year: 2026 }, grantable_amount_total: 6588, grantable_amount: 2280, grantable_cofinancing: 1680 }
        ]
      },
      { id: 2, name: 'Antic', clients: [{ name: 'Diputació' }], justification_date: '2026-12-01', grantable_amount_total: 500, grantable_amount: 400, grantable_cofinancing: 50, project_state: { id: 1 } }
    )
    const w = mount(Grants, {
      global: { plugins: [createPinia(), Buefy], stubs: { 'router-link': { template: '<a><slot /></a>' }, 'title-bar': true, 'download-excel': true } }
    })
    await flushPromises()
    expect(get.mock.calls.some(([url]) => url.includes('grantable_years'))).toBe(true)
    expect(w.vm.missing(w.vm.rows.find(r => r.id === 268))).toEqual([])
    expect(w.vm.totalAmount).toBe(7588 + 500)
    expect(w.vm.totalCofinancing).toBe(1780 + 50)
    const row = w.findAll('tbody tr').find(r => r.text().includes('Enfortim'))
    expect(row.text()).toContain('7.588,00')
    expect(row.text()).toContain('3.080,00')
    expect(row.text()).not.toContain('falta')
  })
})
