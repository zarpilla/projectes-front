// issues/444: hovering the «Total» column of «% Dedicació real» shows the
// whole year like a month: hours per project (regroupable by type/àmbit) with
// their %, and the working-day hours of every period added up.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { annualCell } from '@/domain/dedicationAnnual.js'
import DedicationGanttChart from '@/components/DedicationGanttChart.vue'

const periods = [{ key: '2026-01', label: 'GEN 2026' }, { key: '2026-02', label: 'FEB 2026' }, { key: '2026-03', label: 'MAR 2026' }]
const row = {
  '2026-01': {
    hours: '100.00', expected: 120, festive: 8, diff: 20,
    breakdown: [
      { project: 'A', type: 'Web', scope: 'Urtur', hours: 60 },
      { project: 'B', type: 'Formació', scope: 'Balkar', hours: 40 }
    ]
  },
  '2026-02': {
    hours: '50.00', expected: 80, festive: 0, diff: 30,
    breakdown: [
      { project: 'B', type: 'Formació', scope: 'Balkar', hours: 30 },
      { project: 'C', type: 'Web', scope: 'Urtur', hours: 20 }
    ]
  },
  // future month: no hours, no working day
  '2026-03': { hours: '0.00', percentage: '0', cssClass: 'dedication-empty', tooltip: 'Sense dedicació' }
}

describe('annual cell of the «Total» column (issues/444)', () => {
  it('adds every month up, project by project', () => {
    const c = annualCell(row, periods)
    expect(c.hours).toBe('150.00')
    expect(c.expected).toBe(200)
    expect(c.festive).toBe(8)
    expect(c.diff).toBe(50)
    expect(c.percentage).toBe('75')
    expect(c.breakdown).toEqual([
      { project: 'B', type: 'Formació', scope: 'Balkar', hours: 70 },
      { project: 'A', type: 'Web', scope: 'Urtur', hours: 60 },
      { project: 'C', type: 'Web', scope: 'Urtur', hours: 20 }
    ])
  })

  it('does not change the month cells', () => {
    annualCell(row, periods)
    expect(row['2026-01'].breakdown[1].hours).toBe(40)
  })

  it('a person without data gives an empty cell', () => {
    const c = annualCell(undefined, periods)
    expect(c.hours).toBe('0.00')
    expect(c.breakdown).toEqual([])
    expect(c.diff).toBeUndefined()
  })

  it('hovering «Total» shows the year grouped like a month', async () => {
    const w = mount(DedicationGanttChart, {
      props: {
        leaders: [{ id: 7, username: 'Anna', works: true }],
        periods,
        cells: { 7: row },
        view: 'month',
        grouping: 'type',
        title: 'Hores'
      },
      global: { plugins: [createPinia(), Buefy] },
      attachTo: document.body
    })
    await w.find('td.total-cell').trigger('mouseenter')
    const tip = w.find('.dedication-tooltip')
    expect(tip.text()).toContain('Total hores 2026')
    expect(tip.text()).toContain('150,00 h')
    const groups = tip.findAll('.dt-group-header').map(g => g.text().replace(/\s+/g, ' '))
    expect(groups[0]).toContain('Web')
    expect(groups[0]).toContain('80,00 h (53%)')
    expect(groups[1]).toContain('Formació')
    expect(groups[1]).toContain('70,00 h (47%)')
    expect(tip.text()).toContain('Hores de jornada')
    expect(tip.text()).toContain('200,00 h')
    w.unmount()
  })
})
