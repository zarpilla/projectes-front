// issues/077: a person with hours but a 0 h working day showed «0 %»; the
// front guessed it from the percentage, so a real 0 % (0,3 h of 160 h) was
// also shown as «s/j». The backend now flags the cell (noSchedule).
import { describe, it, expect } from 'vitest'
import DedicationGanttChart from '@/components/DedicationGanttChart.vue'

const m = DedicationGanttChart.methods
const ctx = { noSchedule: m.noSchedule }
const text = c => m.percentText.call(ctx, c)
const cls = c => m.cellClass.call(ctx, c)

describe('dedication gantt cells (issues/077)', () => {
  it('«s/j» only when the backend says there is no working day', () => {
    expect(text({ hours: '34.66', percentage: '0', noSchedule: true })).toBe('s/j')
    expect(cls({ hours: '34.66', percentage: '0', noSchedule: true, cssClass: 'dedication-empty' })).toBe('dedication-nojornada')
    expect(text({ hours: '0.30', percentage: '0', noSchedule: false })).toBe('↓ 0 %')
    expect(cls({ hours: '0.30', percentage: '0', noSchedule: false, cssClass: 'dedication-low' })).toBe('dedication-low')
  })

  it('reads older answers without the flag as before', () => {
    expect(text({ hours: '34.66', percentage: '0' })).toBe('s/j')
    expect(text({ hours: '100', percentage: '120' })).toBe('↑ 120 %')
  })

  it('empty cells stay empty', () => {
    expect(cls({ hours: '0.00', percentage: '0' })).toBe('dedication-empty')
  })
})
