// issues/413: the sections (Moviments, Regles, Extractes) sit in the filter bar,
// not in a second row of tabs under Tresoreria's own; the account and status
// filters only show with the movements, the upload is always there
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({
  default: () => ({
    get: vi.fn((url) => Promise.resolve({ data: /reconciliation/.test(url) ? { movements: [] } : [] })),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  })
}))

import BankReconciliation from '@/components/BankReconciliation.vue'

describe('Conciliació filter bar (issues/413)', () => {
  it('holds the sections, and the filters only for the movements', async () => {
    const w = mount(BankReconciliation, { global: { plugins: [Buefy], stubs: { 'router-link': true } } })
    await flushPromises()
    const bar = w.find('form.filter-bar')
    expect(bar.find('.recon-sections').exists()).toBe(true)
    expect(w.findAll('.segmented').filter(s => !s.element.closest('form.filter-bar'))).toHaveLength(0)
    expect(bar.findAll('.recon-sections button').map(b => b.text())).toEqual(['Moviments', 'Regles', 'Extractes'])
    expect(bar.find('[aria-label="Estat"]').exists()).toBe(true)
    expect(bar.text()).toContain('Puja un extracte')

    await bar.findAll('.recon-sections button')[1].trigger('click')
    await flushPromises()
    expect(w.find('[aria-label="Estat"]').exists()).toBe(false)
    expect(w.find('form.filter-bar').text()).toContain('Puja un extracte')
    expect(w.text()).toContain('Afegeix una regla')
  })
})
