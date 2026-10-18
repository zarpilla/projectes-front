// issues/068: going from /project/5 to /project/0 (back/forward, or the URL)
// reused the form with the last project's name, state and leader: the route
// gives the id as the string "0", which the watcher didn't take as «new».
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectForm from '@/views/ProjectForm.vue'

const vm = () => ({
  form: { id: 5, name: 'Projecte vell' },
  getClearFormObject: ProjectForm.methods.getClearFormObject,
  getAuxiliarData: vi.fn(),
  getData: vi.fn(),
  project_scopes: [],
  project_likelihoods: [],
  startNewProject: ProjectForm.methods.startNewProject
})

describe('ProjectForm new project (issues/068)', () => {
  it('clears the form for the route id "0"', () => {
    const c = vm()
    ProjectForm.watch.id.call(c, '0')
    expect(c.form.name).not.toBe('Projecte vell')
    expect(c.form.id).toBeFalsy()
    expect(c.getAuxiliarData).toHaveBeenCalled()
    expect(c.getData).not.toHaveBeenCalled()
  })

  it('loads an existing project', () => {
    const c = vm()
    ProjectForm.watch.id.call(c, '7')
    expect(c.getData).toHaveBeenCalled()
  })

  // issues/110: coming from a project, «new project» showed the old one-page
  // form instead of the creation wizard
  it('opens the creation wizard', () => {
    const c = vm()
    c.isCreationMode = false
    ProjectForm.watch.id.call(c, '0')
    expect(c.isCreationMode).toBe(true)
    expect(c.currentStep).toBe(1)
    expect(c.form.creation_step).toBe('basic_data')
  })
})

// issues/126: a new project has no `form.periodification` yet, and the
// periodification card read its length unguarded (TypeError on /project/0)
describe('ProjectForm periodification card (issues/126)', () => {
  const has = ctx => ProjectForm.computed.hasPeriodificationRows.call(ctx)
  it('is off, without throwing, when the project has no periodification rows', () => {
    expect(has({ periodification: true, form: {} })).toBe(false)
    expect(has({ periodification: true, form: { periodification: [] } })).toBe(false)
    expect(has({ periodification: false, form: { periodification: [{}] } })).toBe(false)
  })
  it('is on when the project periodifies and has rows', () => {
    expect(has({ periodification: true, form: { periodification: [{ year: 1 }] } })).toBe(true)
  })
})

// issues/129: opening a project that periodifies and then one that doesn't,
// without a reload, kept the switch on (the component is reused by the route)
describe('ProjectForm periodification switch between projects (issues/129)', () => {
  const load = (periodification, rows) => {
    const ctx = { periodification, form: { periodification: rows }, updatePeriodification: vi.fn() }
    ProjectForm.methods.applyLoadedPeriodification.call(ctx)
    return ctx
  }
  it('turns off for a project without periodification rows', () => {
    expect(load(true, []).periodification).toBe(false)
    expect(load(true, undefined).periodification).toBe(false)
  })
  it('turns on for a project with rows', () => {
    const ctx = load(false, [{ year: 2026 }])
    expect(ctx.periodification).toBe(true)
    expect(ctx.updatePeriodification).toHaveBeenCalled()
  })
})
