// issues/300: Informes › Dedicació › «Exporta totals per persona» joined project,
// person and year with «.» and split them back, so «Adrinoc. assessorament» or a
// «prova.x» user came out in the wrong columns.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DedicationEstPivot from '@/components/DedicationEstPivot.vue'

const totals = pivotData => DedicationEstPivot.computed.pivotDataGroupped.call({ pivotData })

describe('Dedicació totals per persona export (issues/300)', () => {
  it('keeps names with dots whole', () => {
    const rows = totals([
      { project_name: 'Adrinoc. assessorament', username: 'prova.x', year: '2026', hours: 2, estimated_hours: 0, original_estimated_hours: 0, real_cost: 30 },
      { project_name: 'Adrinoc. assessorament', username: 'prova.x', year: '2026', hours: 0, estimated_hours: 5, original_estimated_hours: 4, real_cost: 0 },
      { project_name: 'Adrinoc. assessorament', username: 'anna', year: '2026', hours: 1, estimated_hours: 0, original_estimated_hours: 0, real_cost: 15 }
    ])
    expect(rows.map(({ rows: _, ...r }) => r)).toEqual([
      { project_name: 'Adrinoc. assessorament', username: 'prova.x', year: '2026', estimated_hours: 5, original_estimated_hours: 4, hours: 2, real_cost: 30 },
      { project_name: 'Adrinoc. assessorament', username: 'anna', year: '2026', estimated_hours: 0, original_estimated_hours: 0, hours: 1, real_cost: 15 }
    ])
  })
})
