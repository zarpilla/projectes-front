// issues/261: the Tresoreria year buttons only changed ?year= in the URL; the
// data wasn't reloaded, so the past year was drawn on the current year's opening.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

// the page loads its years at mount (issues/307: without waiting for Kendo)
const api = {
  get: vi.fn(async url => ({ data: url.startsWith('years') ? [{ year: 2026 }, { year: 2025 }] : [] })),
  put: vi.fn(),
  post: vi.fn()
}
vi.mock('@/service/index', () => ({ default: () => api }))
const getTreasuryData = vi.fn(async () => ({ vat: {}, vat_expected: {}, treasury: [], projects: [] }))
vi.mock('@/service/treasury', () => ({ default: (...a) => getTreasuryData(...a) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'

describe('Tresoreria year buttons (issues/261)', () => {
  it('load the chosen year', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div/>' } }]
    })
    await router.push('/?year=2026')
    const w = mount(TresoreriaTable, {
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      }
    })
    w.vm.initializePivotWithViews = () => {}
    await w.setData({ years: [{ year: 2026 }, { year: 2025 }] })
    await flushPromises()
    getTreasuryData.mockClear()

    const button = w.findAll('.segmented button').find(b => b.text() === '2025')
    await button.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.year).toBe('2025')
    expect(getTreasuryData).toHaveBeenCalledTimes(1)
    expect(getTreasuryData.mock.calls[0][1]).toBe('2025')
  })
})
