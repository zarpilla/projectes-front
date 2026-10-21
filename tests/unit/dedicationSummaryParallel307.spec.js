// issues/307: Dedicació › Resum asked the logged hours, then the year, the
// festive types, the festives, the person's working periods and three lists of
// holiday allowances, one after another (eight round trips). They go together
// now; the summary is the same.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import DedicationSummary from '@/components/DedicationSummary.vue'

let pending
beforeEach(() => {
  pending = []
  api.get.mockReset()
  api.get.mockImplementation(url => new Promise(resolve => pending.push({ url, resolve })))
})

const DATA = {
  'activities/total-by-day': [{ date: '2026-03-02', hours: 6 }],
  years: [{ year: 2026, working_hours: 1600 }],
  'festive-types': [{ id: 1, name: 'Vacances', max: 22 }],
  festives: [{ date: '2026-03-03', users_permissions_user: { id: 7 }, festive_type: { id: 1, name: 'Vacances' } }],
  'daily-dedications': [{ from: '2026-01-01', to: '2026-12-31', hours: 8, users_permissions_user: { id: 7 } }],
  'user-festives': []
}
const answerAll = () => pending.forEach(p => p.resolve({ data: DATA[p.url.split('?')[0]] }))

describe('Dedicació › Resum (issues/307)', () => {
  it('asks the hours and everything else at once, and shows the summary', async () => {
    const errors = []
    const w = mount(DedicationSummary, {
      props: { user: 7, year: 2026 },
      global: { plugins: [createPinia(), Buefy], config: { warnHandler: () => {}, errorHandler: e => errors.push(e) } }
    })
    await flushPromises()
    expect(pending.map(p => p.url.split('?')[0]).sort()).toEqual([
      'activities/total-by-day',
      'daily-dedications',
      'festive-types',
      'festives',
      'user-festives',
      'user-festives',
      'user-festives',
      'years'
    ])
    answerAll()
    await flushPromises()
    expect(errors).toEqual([])
    expect(w.vm.isLoading).toBe(false)
  })
})
