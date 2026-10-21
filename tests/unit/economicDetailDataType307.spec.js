// issues/307: in Ingressos/Despeses, «Totes / Previsió / Execució» mounted the
// pivot again, which asked the whole economic detail again (6.8 s in
// production) for the same rows. Now the choice only redraws the pivot with
// its measures; the states and the year still reload.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import EconomicDetailPivot from '@/components/EconomicDetailPivot.vue'
import StatsEconomicDetail from '@/views/StatsEconomicDetail.vue'
import configPivot from '@/service/configStatsEconomicDetail'
import { economicDetailMeasures } from '@/domain/economicDetailMeasures'

const rows = [
  { id: 1, project_name: 'P', year: '2026', month: '01', date: '2026-01-10', income_esti: 100, income_real: 50 }
]

const mountPivot = (props = {}) => {
  const w = mount(EconomicDetailPivot, {
    props: { projectStates: [1, 2], year: '2026', dataType: 'Totes', ...props },
    global: {
      plugins: [createPinia(), Buefy],
      stubs: { PivotViews: true },
      mocks: {},
      config: { warnHandler: () => {} }
    }
  })
  return w
}

beforeEach(() => {
  get.mockReset()
  get.mockResolvedValue({ data: rows })
})

describe('Ingressos/Despeses: the data type redraws, it does not reload (issues/307)', () => {
  it('asks the economic detail once, and draws the measures of each choice', async () => {
    const drawn = []
    const original = EconomicDetailPivot.methods.initializePivotWithViews
    EconomicDetailPivot.methods.initializePivotWithViews = (selector, config) => drawn.push([...config.dataSource.measures])
    try {
      // the saved views of the pivot are asked too (pivotViewsMixin)
      const details = () => get.mock.calls.map(c => c[0]).filter(url => url.startsWith('projects/economic-detail'))
      const w = mountPivot()
      await flushPromises()
      expect(details()).toEqual(['projects/economic-detail?_where[project_state_in]=1,2&_limit=-1&_where[year_eq]=2026'])

      await w.setProps({ dataType: 'Previsió' })
      await w.setProps({ dataType: 'Execució' })
      await w.setProps({ dataType: 'Totes' })
      await flushPromises()

      expect(details()).toHaveLength(1)
      expect(drawn).toEqual([
        economicDetailMeasures('Totes'),
        economicDetailMeasures('Previsió'),
        economicDetailMeasures('Execució'),
        economicDetailMeasures('Totes')
      ])
      expect(configPivot.dataSource.data).toHaveLength(1)
    } finally {
      EconomicDetailPivot.methods.initializePivotWithViews = original
    }
  })

  it('the page reloads for the states and the year, not for the data type', () => {
    const scheduleRefresh = vi.fn()
    const watch = StatsEconomicDetail.watch
    watch['filters.year'].call({ scheduleRefresh }, '2025', '2026')
    watch.selectedProjectStates.handler.call({ scheduleRefresh }, [1], [1, 2])
    expect(scheduleRefresh).toHaveBeenCalledTimes(2)
    expect(watch['filters.dataType']).toBeUndefined()
  })

  it('keeps the three sets of measures', () => {
    expect(economicDetailMeasures('Previsió')).toEqual(['Resultat prev', 'Ingressos prev', 'Despeses tot prev', 'Despeses prev', 'Hores prev', 'Hores prev (h)'])
    expect(economicDetailMeasures('Execució')).toEqual(['Resultat exec', 'Ingressos exec', 'Despeses tot exec', 'Despeses exec', 'Hores exec', 'Hores exec (h)'])
    expect(economicDetailMeasures('Totes')).toHaveLength(18)
    expect(economicDetailMeasures(null)).toEqual(economicDetailMeasures('Totes'))
  })
})
