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
