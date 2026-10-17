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
