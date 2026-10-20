// issues/305: the report screens waited for jQuery (Kendo needs it) with an
// interval that only stopped once window.jQuery existed. Leaving the screen
// before that kept it polling, and it later loaded Kendo and data for a screen
// that was gone; in CI it fired after the test environment was torn down.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { waitForJQuery } from '@/helpers/addScript'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))

const screens = {
  StatsProjectes: () => import('@/views/StatsProjectes.vue'),
  Justifications: () => import('@/views/Justifications.vue'),
  StatsDedicacio: () => import('@/views/StatsDedicacio.vue'),
  StatsOrders: () => import('@/views/StatsOrders.vue'),
  StatsIncidences: () => import('@/views/StatsIncidences.vue'),
  StatsIntercoop: () => import('@/views/StatsIntercoop.vue'),
  StatsEstrategies: () => import('@/views/StatsEstrategies.vue'),
  StatsEconomicDetail: () => import('@/views/StatsEconomicDetail.vue'),
  VatTable: () => import('@/components/VatTable.vue'),
  PrevisioTable: () => import('@/components/PrevisioTable.vue'),
  TresoreriaTable: () => import('@/components/TresoreriaTable.vue')
}

describe('waiting for jQuery (issues/305)', () => {
  let jQuery
  beforeEach(() => {
    // jQuery not there yet: the wait keeps polling
    jQuery = window.jQuery
    delete window.jQuery
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    window.jQuery = jQuery
  })

  it('runs once jQuery exists, and not after it is stopped', () => {
    const ready = vi.fn()
    waitForJQuery(ready)
    vi.advanceTimersByTime(300)
    expect(ready).not.toHaveBeenCalled()
    window.jQuery = () => {}
    vi.advanceTimersByTime(100)
    expect(ready).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)

    delete window.jQuery
    const late = vi.fn()
    const stop = waitForJQuery(late)
    stop()
    window.jQuery = () => {}
    vi.advanceTimersByTime(500)
    expect(late).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  // the first import of a view takes several seconds in the full suite
  it.each(Object.keys(screens))('%s stops waiting when it is left', { timeout: 30000 }, async (name) => {
    const { default: Screen } = await screens[name]()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div/>' } }]
    })
    const w = shallowMount(Screen, {
      global: { plugins: [createPinia(), Buefy, router], config: { warnHandler: () => {} } }
    })
    await flushPromises()
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    w.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
