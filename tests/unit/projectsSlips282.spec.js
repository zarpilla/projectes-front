// issues/282 (review 8): small slips in the project area.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
import moment from 'moment'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn() }) }))

import ProjectForm from '@/views/ProjectForm.vue'
import Home from '@/views/Home.vue'
import ProjectGrantableYears from '@/components/ProjectGrantableYears.vue'
import { isOpenChild } from '@/domain/motherFigures'
import { draggedRange, dedicationDates } from '@/domain/ganttDedication'

describe("mother's Planificació: active children", () => {
  // /projects/:id/children sends project_state populated
  const children = [
    { id: 280, name: 'S1 wizard prova', project_state: { id: 1, name: 'Obert' } },
    { id: 282, name: 'Tancat', project_state: { id: 2, name: 'Tancat' } },
    { id: 283, name: 'Sense estat', project_state: null }
  ]
  const vm = { form: { children: { children } } }

  it('shows active children as active', () => {
    expect(ProjectForm.computed.openChildren.call(vm).map(c => c.id)).toEqual([280])
    expect(ProjectForm.computed.closedChildren.call(vm).map(c => c.id)).toEqual([282, 283])
  })

  it('also takes a bare state id', () => {
    expect(isOpenChild({ project_state: 1 })).toBe(true)
    expect(isOpenChild({ project_state: 2 })).toBe(false)
    expect(isOpenChild({})).toBe(false)
  })
})

describe('Gantt «Mesos» drag inside one month', () => {
  // dhtmlx on the month scale: round to the nearest month start
  const helpers = {
    round: d => {
      const m = moment(d)
      const start = moment(m).startOf('month')
      const next = moment(start).add(1, 'month')
      return (m.diff(start) < next.diff(m) ? start : next).toDate()
    },
    floor: d => moment(d).startOf('month').toDate(),
    next: d => moment(d).add(1, 'month').toDate()
  }

  it('keeps the month where the drag started', () => {
    const { start, end } = draggedRange(new Date(2026, 3, 18), new Date(2026, 3, 27), helpers)
    expect(moment(start).format('YYYY-MM-DD')).toBe('2026-04-01')
    expect(moment(end).format('YYYY-MM-DD')).toBe('2026-05-01')
    expect(dedicationDates(start, end)).toEqual({ from: '2026-04-01', to: '2026-04-30' })
  })

  it('keeps a drag over several months as rounded', () => {
    const { start, end } = draggedRange(new Date(2026, 0, 3), new Date(2026, 2, 29), helpers)
    expect(dedicationDates(start, end)).toEqual({ from: '2026-01-01', to: '2026-03-31' })
  })

  it('the form saves the dragged dedication without inverting it', () => {
    const subphase = { id: 9, estimated_hours: [] }
    const vm = { ganttViewMode: 'estimated', form: { project_phases: [{ id: 3, incomes: [subphase] }] } }
    ProjectForm.methods.ganttItemUpdate.call(vm, {
      _uuid: 'u1', _phase: { id: 3 }, _subphase: subphase,
      _hours: { quantity: 20, quantity_type: 'total' },
      start_date: new Date(2026, 4, 1), end_date: new Date(2026, 4, 1)
    })
    const [h] = subphase.estimated_hours
    expect(h.from).toBe('2026-05-01')
    expect(h.to >= h.from).toBe(true)
  })

  it('never saves an end before the start', () => {
    // what the Gantt handed over: 2026-05-01 → 2026-05-01 (saved as → 04-30)
    expect(dedicationDates('2026-05-01', '2026-05-01')).toEqual({ from: '2026-05-01', to: '2026-05-31' })
    expect(dedicationDates('2026-05-01', null)).toEqual({ from: '2026-05-01', to: '2026-05-31' })
    expect(dedicationDates('2026-05-01', '2026-05-02')).toEqual({ from: '2026-05-01', to: '2026-05-01' })
  })
})

describe('Dades: client and function autocompletes', () => {
  const methods = ['clientSelected', 'activityTypeSelected', 'cooperaSelected', 'strategiesSelected']

  it.each(methods)('%s ignores select(null)', name => {
    const vm = { form: { clients: [], global_activity_types: [], intercooperations: [], strategies: [] } }
    expect(() => ProjectForm.methods[name].call(vm, null)).not.toThrow()
    expect(vm.form.clients).toEqual([])
    expect(vm.form.global_activity_types).toEqual([])
  })

  it('still adds a chosen client', () => {
    const vm = { form: { clients: [] } }
    ProjectForm.methods.clientSelected.call(vm, { id: 4, name: 'Client' })
    expect(vm.form.clients.map(c => c.id)).toEqual([4])
  })
})

describe('«Imports per any» year select', () => {
  it('lists the years in ascending order', async () => {
    const years = [2021, 2019, 2020, 2022].map((year, i) => ({ id: i + 1, year }))
    const w = mount(ProjectGrantableYears, {
      props: { years, grantableYears: [{ year: 1, grantable_amount: 0 }] },
      global: { plugins: [Buefy] }
    })
    await w.vm.$nextTick()
    const options = w.findAll('option').map(o => o.text())
    expect(options).toEqual(['2019', '2020', '2021', '2022'])
  })
})

describe('Projects search', () => {
  it('encodes the term in the URL', async () => {
    get.mockResolvedValueOnce({ data: [] })
    const vm = { filters: { project_state: 1, q: 'Pa & Mel #2 + 1', user: '0', scopeId: 0 }, applyProjects: vi.fn() }
    Home.methods.doFilteredQuery.call(vm, vm.filters.q)
    const url = get.mock.calls.at(-1)[0]
    expect(url).toContain('_q=' + encodeURIComponent('Pa & Mel #2 + 1') + '&project_state=1')
    expect(new URLSearchParams(url.split('?')[1]).get('_q')).toBe('Pa & Mel #2 + 1')
  })
})
