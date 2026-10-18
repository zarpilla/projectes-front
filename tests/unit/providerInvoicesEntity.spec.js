// Found while writing the manual (2026-10): a member's «Factures» (logistics,
// `orders` permission) said «Les factures de logística que l'entitat t'ha
// emès» because the entity (`me`) was only in the store after a projects
// screen loaded it, and the column with the invoice's projects was titled
// «Ruta».
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'

const invoice = {
  id: 1,
  code: '2026-001',
  emitted: '2026-03-01',
  total_base: 10,
  total_vat: 2.1,
  total: 12.1,
  projects: [{ id: 7, name: 'Repartiment de cistelles' }],
  lines: []
}
const get = vi.fn(async url => {
  if (url.startsWith('years')) return { data: [{ year: 2026 }] }
  if (url === 'users/me') return { data: { id: 3 } }
  if (url === 'me') return { data: { id: 1, name: 'Cooperativa Demo' } }
  if (url.startsWith('contacts?')) return { data: [{ id: 8 }] }
  if (url.startsWith('emitted-invoices/basic')) return { data: [invoice] }
  if (url.startsWith('phase-incomes/assigned')) return { data: { invoices: [], incomes: [] } }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import EmittedInvoicesProvider from '@/views/EmittedInvoicesProvider.vue'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'

describe('«Factures» of a member', () => {
  it("names the entity in the subtitle even when the store doesn't have it yet", async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(EmittedInvoicesProvider, {
      global: { plugins: [pinia, Buefy], stubs: { 'title-bar': true, 'emitted-invoices-table': true } }
    })
    await flushPromises()
    expect(w.find('title-bar-stub').attributes('subtitle')).toBe(
      "Les factures de logística que Cooperativa Demo t'ha emès."
    )
  })

  it('titles the column with the invoice projects «Projecte», not «Ruta»', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(EmittedInvoicesTable, {
      props: { year: 2026, month: 0, quarter: 0, contact: 8, provider: true },
      global: { plugins: [pinia, Buefy], stubs: { 'router-link': true } }
    })
    await flushPromises()
    const headers = w.findAll('th').map(th => th.text())
    expect(headers).toContain('Projecte')
    expect(headers).not.toContain('Ruta')
    expect(w.text()).toContain('Repartiment de cistelles')
  })
})
