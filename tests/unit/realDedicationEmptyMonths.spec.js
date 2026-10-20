// issues/300: in «% Dedicació real» a month with a working day but no hours
// showed «—» and «Sense dedicació». The backend now sends the period's hours
// (expected) for it: the cell shows 0 % and the tooltip «Hores període».
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import DedicationGanttChart from '@/components/DedicationGanttChart.vue'
import DedicationTooltip from '@/components/DedicationTooltip.vue'

const noHours = { hours: '0.00', percentage: '0', cssClass: 'dedication-low', tooltip: 'Hores període: 132.00h\nFalten: 132.00h', breakdown: [], expected: 132, festive: 0, noSchedule: false, diff: 132 }
const empty = { hours: '0.00', percentage: '0', cssClass: 'dedication-empty', tooltip: 'Sense dedicació' }

function chart () {
  return mount(DedicationGanttChart, {
    props: {
      leaders: [{ id: 1, username: 'anna', works: true }, { id: 2, username: 'pau', works: true }],
      periods: [{ key: '2026-03', label: 'març 2026' }, { key: '2026-04', label: 'abr 2026' }],
      cells: {
        1: { '2026-03': noHours, '2026-04': { ...noHours, hours: '100.00', percentage: '76', breakdown: [{ project: 'P', hours: 100 }] } },
        2: { '2026-03': empty, '2026-04': { ...noHours, hours: '8.00', percentage: '6', breakdown: [{ project: 'P', hours: 8 }] } }
      },
      view: 'month'
    },
    global: { plugins: [createPinia()] }
  })
}

describe('% Dedicació real, months without hours (issues/300)', () => {
  it('shows 0 % when there is a working day', () => {
    const cells = chart().findAll('tbody tr')[0].findAll('td.period-cell')
    expect(cells[0].text()).toContain('↓ 0 %')
    expect(cells[0].classes()).toContain('dedication-low')
  })

  it('keeps «—» without a working day', () => {
    const cells = chart().findAll('tbody tr')[1].findAll('td.period-cell')
    expect(cells[0].text()).toBe('—')
    expect(cells[0].classes()).toContain('dedication-empty')
  })

  it('the tooltip gives the period hours', () => {
    const w = mount(DedicationTooltip, { props: { cell: noHours } })
    expect(w.text()).toContain('Sense hores')
    expect(w.text()).toContain('Hores període')
    expect(w.text()).toContain('Falten')
    expect(DedicationGanttChart.methods._hasContent(noHours)).toBe(true)
  })
})
