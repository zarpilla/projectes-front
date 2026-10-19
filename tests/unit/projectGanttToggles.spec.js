// issues/214: "Només fases" and "Línies d'ingrés" in the project gantt were
// forgotten on every reload, and a rebuild (toggling "Línies d'ingrés")
// reopened every phase while "Només fases" stayed ticked.
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectGannt from '@/components/ProjectGannt.vue'

beforeEach(() => localStorage.clear())

const fakeGantt = () => ({
  config: { types: { project: 'project', milestone: 'milestone' }, scales: [] },
  templates: {},
  plugins: vi.fn(),
  i18n: { setLocale: vi.fn() },
  attachEvent: vi.fn(),
  eachTask: vi.fn(),
  open: vi.fn(),
  close: vi.fn()
})

describe('ProjectGannt toggles (issues/214)', () => {
  it('starts unticked when nothing was saved', () => {
    expect(ProjectGannt.data.call({}).collapsed).toBe(false)
  })

  it('remembers "Només fases"', () => {
    const c = { gantt: fakeGantt(), collapsed: false }
    ProjectGannt.methods.collapse.call(c)
    expect(c.collapsed).toBe(true)
    expect(ProjectGannt.data.call({}).collapsed).toBe(true)

    ProjectGannt.methods.collapse.call(c)
    expect(ProjectGannt.data.call({}).collapsed).toBe(false)
  })

  it('remembers "Línies d\'ingrés" over the profile default', () => {
    const c = { showSubPhases: false, rebuildGantt: vi.fn() }
    ProjectGannt.methods.toggleSubphases.call(c)
    expect(localStorage.getItem('projectGantt.showSubPhases')).toBe('1')
  })

  it('keeps the phases closed when the gantt is rebuilt', () => {
    const c = {
      gantt: fakeGantt(),
      collapsed: true,
      showSubPhases: false,
      viewMode: 'current',
      project: {
        date_start: '2026-01-01',
        date_end: '2026-12-31',
        project_phases: [{ id: 1, name: 'Fase 1', incomes: [] }]
      },
      meOptions: {},
      projectTasks: [],
      editable: false,
      view: 'month',
      ganttId: 'not-in-the-dom'
    }
    ProjectGannt.methods.initializeGannt.call(c)
    expect(c.tasks.data.find((t) => t.id === 1).open).toBe(false)
  })
})
