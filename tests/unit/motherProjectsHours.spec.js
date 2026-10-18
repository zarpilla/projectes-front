// Projectes mare showed hours as 1192.00 (issues/091) and money as
// «-2.677,97€» (issues/104); since issues/134 the list is the Projectes table
// (name with client, tags, hours bar, coloured results, totals row, count).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const mothers = [
  { id: 2, name: 'Mare B', is_mother: true, clients: [{ name: 'Ajuntament' }], project_scope: { id: 1, name: 'Consum' }, project_state: { id: 1, name: 'Actiu' }, total_real_hours: 1192, total_estimated_hours: 1500.5, total_real_incomes_expenses: -2677.97, incomes_expenses: 2940 },
  { id: 1, name: 'Mare A', is_mother: true, total_real_hours: 272.1, total_estimated_hours: 0, total_real_incomes_expenses: 100, incomes_expenses: 60 },
  { id: 3, name: 'Fill', is_mother: false, total_real_hours: 5 }
]
vi.mock('@/service/index', () => ({
  default: () => ({
    get: vi.fn(url => Promise.resolve({
      data: url.startsWith('project-states') ? [{ id: 1, name: 'Actiu' }]
        : url.startsWith('projects?') ? mothers
          : []
    }))
  })
}))
import MotherProjectsList from '@/views/MotherProjectsList.vue'

async function mountList () {
  const w = mount(MotherProjectsList, {
    global: {
      plugins: [Buefy],
      stubs: { 'router-link': { template: '<a><slot /></a>' }, 'download-excel': { template: '<span><slot /></span>' } }
    }
  })
  await flushPromises()
  return w
}

describe('Projectes mare list (issues/091, 104, 134)', () => {
  it('formats hours and money like the other lists', async () => {
    const text = (await mountList()).text()
    expect(text).toContain('1.192 h')
    expect(text).toContain('1.500,5 h')
    expect(text).toContain('272,1 h')
    expect(text).toMatch(/2\.677,97\s€/)
    expect(text).not.toContain('1192.00')
    expect(text).not.toMatch(/\d€/)
  })

  it('uses the Projectes table: client line, tags, hours bar, totals and the count', async () => {
    const w = await mountList()
    expect(w.findAll('.project-subline').map(s => s.text())).toEqual(['Sense clienta', 'Ajuntament'])
    expect(w.findAll('.tag').map(t => t.text())).toContain('Consum')
    expect(w.findAll('.hours-bar').length).toBe(2)
    expect(w.find('.has-text-neg').exists()).toBe(true)
    expect(w.find('tfoot').text()).toContain('Total · 2 projectes')
    expect(w.find('tfoot').text()).toMatch(/3\.000,00\s€/)
    expect(w.find('.subtitle-line').text()).toBe('2 projectes mare')
    // only the mothers, by name
    expect(w.findAll('.project-name').map(a => a.text())).toEqual(['Mare A', 'Mare B'])
  })
})
