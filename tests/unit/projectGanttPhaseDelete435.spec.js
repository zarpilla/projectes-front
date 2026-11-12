// issues/435: on the project planning, a bin on a phase row deletes all the
// dedications of that phase at once, after a confirmation. Each one goes to
// the form as a normal delete (saved with the project).
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectGannt from '@/components/ProjectGannt.vue'

const M = ProjectGannt.methods
const fakeGantt = () => ({
  config: { types: { project: 'project', milestone: 'milestone' }, scales: [] },
  templates: {},
  plugins: vi.fn(),
  i18n: { setLocale: vi.fn() },
  attachEvent: vi.fn(),
  isTaskExists: vi.fn(() => true),
  deleteTask: vi.fn(),
  refreshTask: vi.fn()
})

const phaseA = { id: 1, name: 'I224', incomes: [{ id: 11, concept: 'Hores', estimated_hours: [
  { id: 101, from: '2026-05-01', to: '2026-10-31', quantity: 200, quantity_type: 'total', users_permissions_user: { username: 'damia' } },
  { id: 102, from: '2026-11-01', to: '2026-11-30', quantity: 1, quantity_type: 'total', users_permissions_user: { username: 'damia' } }
] }] }
const phaseB = { id: 2, name: 'I226', incomes: [{ id: 21, concept: 'Hores', estimated_hours: [
  { id: 201, from: '2026-05-01', to: '2026-06-30', quantity: 10, quantity_type: 'total' }
] }] }

const context = (extra = {}) => {
  const c = {
    gantt: fakeGantt(),
    collapsed: false,
    showSubPhases: false,
    viewMode: 'current',
    project: { date_start: '2026-01-01', date_end: '2026-12-31', project_phases: [phaseA, phaseB] },
    meOptions: {},
    projectTasks: [],
    editable: true,
    view: 'month',
    ganttId: 'not-in-the-dom',
    $emit: vi.fn(),
    ...extra
  }
  Object.keys(M).forEach(k => { if (!c[k]) c[k] = M[k].bind(c) })
  return c
}

describe('ProjectGannt phase bin (issues/435)', () => {
  it('shows the bin only on phases with dedications, and only when editable', () => {
    const c = context({ project: { date_start: '2026-01-01', date_end: '2026-12-31', project_phases: [phaseA, { id: 3, name: 'Buida', incomes: [] }] } })
    c.initializeGannt()
    const actions = c.gantt.config.columns.find(col => col.name === 'actions')
    const row = id => c.tasks.data.find(t => t.id === id)
    expect(actions.template(row(1))).toContain('gantt-phase-trash')
    expect(actions.template(row(3))).toBe('')
    const dedication = c.tasks.data.find(t => t._hours)
    expect(actions.template(dedication)).toBe('')

    const readOnly = context({ editable: false })
    readOnly.initializeGannt()
    expect(readOnly.gantt.config.columns.find(col => col.name === 'actions')).toBeUndefined()
  })

  it('asks before deleting, naming how many', () => {
    const confirm = vi.fn()
    const c = context({ $buefy: { dialog: { confirm } } })
    c.initializeGannt()
    c.confirmDeletePhaseDedications(c.tasks.data.find(t => t.id === 1))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0].message).toContain('les 2 dedicacions')
    expect(confirm.mock.calls[0][0].message).toContain('I224')
    // nothing deleted until confirmed
    expect(c.$emit).not.toHaveBeenCalled()
    confirm.mock.calls[0][0].onConfirm()
    expect(c.$emit).toHaveBeenCalledTimes(2)
  })

  it('deletes every dedication of that phase and none of the others', () => {
    const c = context()
    c.initializeGannt()
    c.deletePhaseDedications(1)
    const deleted = c.$emit.mock.calls.map(([event, task]) => [event, task._hours.id])
    expect(deleted).toEqual([['gantt-item-delete', 101], ['gantt-item-delete', 102]])
    expect(c.tasks.data.filter(t => t._hours).map(t => t._hours.id)).toEqual([201])
    expect(c.gantt.deleteTask).toHaveBeenCalledTimes(2)
    expect(c.phaseDedicationTasks(1)).toEqual([])
  })
})
