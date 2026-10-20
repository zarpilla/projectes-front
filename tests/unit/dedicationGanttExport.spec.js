// issues/309 (2026-10-20): Informes › Previsió dedicació took 10 s on
// resilience: projects/dedications answered 12 MB, the per-day rows of the
// Excel export, on every load. The gantt now asks without them (rows=false)
// and «Exporta» fetches them with the same query when clicked.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import DedicationGantt from '@/components/DedicationGantt.vue'
import StatsDedicacioGantt from '@/views/StatsDedicacioGantt.vue'

describe('dedication gantt export (issues/309)', () => {
  beforeEach(() => get.mockReset())

  it('loads the gantt without the per-day rows and hands the query to the export', async () => {
    get.mockResolvedValue({ data: { leaders: [{ id: 1 }], periods: [], cells: {}, dedications: [] } })
    const emitted = []
    const ctx = {
      projectStates: [1, 2],
      hoursType: 'previstes',
      year: 2026,
      view: 'month',
      $emit: (name, value) => emitted.push([name, value])
    }

    await DedicationGantt.methods.getActivities.call(ctx)

    const query = 'projects/dedications?_where[project_state_in]=1,2&hoursType=previstes&year=2026&view=month'
    expect(get).toHaveBeenCalledWith(`${query}&rows=false`)
    expect(emitted).toEqual([['export-query', query]])
    expect(ctx.leaders).toEqual([{ id: 1 }])
  })

  it('«Exporta» fetches the rows of the gantt query', async () => {
    get.mockResolvedValue({ data: { dedications: [{ estimated_hours: 2 }] } })
    const ctx = { exportQuery: 'projects/dedications?x=1' }

    expect(await StatsDedicacioGantt.methods.fetchExport.call(ctx)).toEqual([{ estimated_hours: 2 }])
    expect(get).toHaveBeenCalledWith('projects/dedications?x=1')
    expect(await StatsDedicacioGantt.methods.fetchExport.call({ exportQuery: null })).toEqual([])
  })
})
