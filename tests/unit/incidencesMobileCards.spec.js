// issues/208 (user decision, 2026-10-19): at 375 px Incidències was a desktop
// table whose description column shrank to nothing, and the detail opened
// under the whole list. Phones now get one card per incidence, like
// Operacions, and tapping a card brings its detail into view.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import fs from 'node:fs'
import path from 'node:path'

const incidence = { id: 12, state: 'open', description: 'Falten dues caixes', createdAt: '2026-10-18T09:00:00Z', order: { id: 300, contact_trade_name: 'Can Pere', owner: 7 } }
const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 3, permissions: [{ permission: 'orders_admin' }] } }
  if (url === 'users') return { data: [{ id: 7, fullname: 'Mas Alba', permissions: [{ permission: 'orders' }] }] }
  if (url === 'incidences') return { data: [incidence] }
  if (url === 'incidences/12') return { data: { ...incidence, incidence_response: [] } }
  if (url.startsWith('incidences/count')) return { data: 1 }
  if (url === 'orders/300') return { data: { id: 300, status: 'processed' } }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: vi.fn() }) }))
import IncidencesTable from '@/components/IncidencesTable.vue'

describe('Incidències on phones (issues/208)', () => {
  it('shows a card per incidence, and a tap opens and shows its detail', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const wrapper = mount(IncidencesTable, {
      global: {
        plugins: [Buefy, createPinia()],
        stubs: { TitleBar: true, 'router-link': true, 'download-excel': true },
        mocks: { $route: { query: {} } }
      }
    })
    await flushPromises()
    const cards = wrapper.findAll('.inc-cards .inc-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('Falten dues caixes')
    expect(cards[0].text()).toContain('Can Pere')
    await cards[0].trigger('click')
    await flushPromises()
    expect(wrapper.vm.selected.id).toBe(12)
    expect(scrollIntoView).toHaveBeenCalled()
    // the desktop table is still there, unchanged
    expect(wrapper.findAll('.inc-table-wrap .inc-row')).toHaveLength(1)
  })

  // jsdom has no layout: this checks the rules that swap the table for the cards
  it('hides the table and shows the cards up to 768 px', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/IncidencesTable.vue'), 'utf8')
    const phone = source.match(/@media screen and \(max-width: 768px\) \{([\s\S]*?)\n\}/)[1]
    expect(phone).toMatch(/\.inc-table-wrap\s*\{\s*display:\s*none/)
    expect(phone).toMatch(/\.inc-cards\s*\{\s*display:\s*block/)
  })
})
