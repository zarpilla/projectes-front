// issues/410: in «% Dedicació real» and «Previsió dedicació», «Detall per»
// had no «Àmbit» and the hours could not be limited to some àmbits (Urtur,
// Balkar…). The tooltip groups by àmbit now, and an «Àmbit» chip filter sends
// scopes=… to the API (0 = «Sense àmbit»).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import DedicationTooltip from '@/components/DedicationTooltip.vue'
import ScopeToggles, { readStoredScopes } from '@/components/ScopeToggles.vue'
import RealDedicationGantt from '@/components/RealDedicationGantt.vue'
import DedicationGantt from '@/components/DedicationGantt.vue'

const SCOPES = [
  { id: 1, name: 'Urtur' },
  { id: 2, name: 'Balkar' },
  { id: 3, name: 'Antic', disabled: true }
]

beforeEach(() => {
  get.mockReset()
  get.mockImplementation(async (url) => (url.startsWith('project-scopes') ? { data: SCOPES } : { data: {} }))
  localStorage.clear()
})

describe('«Detall per» àmbit (issues/410)', () => {
  it('groups the tooltip rows by àmbit', () => {
    const w = mount(DedicationTooltip, {
      props: {
        grouping: 'scope',
        cell: {
          hours: '10.00',
          breakdown: [
            { project: 'A', scope: 'Urtur', hours: 5 },
            { project: 'B', scope: 'Balkar', hours: 3 },
            { project: 'C', scope: 'Urtur', hours: 2 }
          ]
        }
      }
    })
    const headers = w.findAll('.dt-group-header').map(h => [h.find('.dt-group-dimension').text(), h.find('.dt-group-name').text(), h.find('.dt-group-hours').text()])
    expect(headers).toEqual([['Àmbit:', 'Urtur', '7,00 h (70%)'], ['Àmbit:', 'Balkar', '3,00 h (30%)']])
  })
})

describe('«Àmbit» filter (issues/410)', () => {
  const mountToggles = (modelValue = []) =>
    mount(ScopeToggles, {
      props: { modelValue, storageKey: 'test.scopes', 'onUpdate:modelValue': v => w.setProps({ modelValue: v }) },
      global: { plugins: [Buefy] }
    })
  let w

  it('lists the active àmbits plus «Sense àmbit», «Tots» on by default', async () => {
    w = mountToggles()
    await flushPromises()
    expect(w.findAll('button').map(b => b.text())).toEqual(['Tots', 'Urtur', 'Balkar', 'Sense àmbit'])
    expect(w.find('button.is-on').text()).toBe('Tots')
  })

  it('toggles àmbits, keeps the choice and «Tots» clears it', async () => {
    w = mountToggles()
    await flushPromises()
    await w.findAll('button')[2].trigger('click')
    await w.findAll('button')[3].trigger('click')
    expect(w.props('modelValue')).toEqual([2, 0])
    expect(readStoredScopes('test.scopes')).toEqual([2, 0])
    await w.findAll('button')[0].trigger('click')
    expect(w.props('modelValue')).toEqual([])
  })

  it('forgets stored àmbits that no longer exist', async () => {
    w = mountToggles([1, 3, 99])
    await flushPromises()
    expect(w.props('modelValue')).toEqual([1])
  })

  it('reads a broken stored value as no filter', () => {
    localStorage.setItem('broken', '{')
    expect(readStoredScopes('broken')).toEqual([])
  })
})

describe('the Gantts send the àmbits (issues/410)', () => {
  const stubs = { DedicationGanttChart: true }
  const lastUrl = () => get.mock.calls[get.mock.calls.length - 1][0]

  it('% Dedicació real', async () => {
    const w = mount(RealDedicationGantt, { props: { projectStates: [1], year: 2026, scopes: [] }, global: { stubs } })
    await flushPromises()
    expect(lastUrl()).not.toContain('scopes=')
    await w.setProps({ scopes: [1, 0] })
    await flushPromises()
    expect(lastUrl()).toContain('&scopes=1,0')
  })

  it('Previsió dedicació', async () => {
    const w = mount(DedicationGantt, { props: { projectStates: [1], year: 2026, scopes: [2] }, global: { stubs } })
    await flushPromises()
    expect(lastUrl()).toContain('&scopes=2&rows=false')
  })
})
