// «Copia la fase a l'execució»: the phases of the budget can now be moved, so
// the copy takes the phase ProjectPhases sends, not the one at the same index
// in the form's list (that list may still be in the order it was loaded in).
import { describe, it, expect, vi, afterEach } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectForm from '@/views/ProjectForm.vue'

const line = (id, concept) => ({ id, documentId: 'doc-' + id, concept, position: 0, date: '2026-03-01', project_original_phase: 1 })
const budgetPhase = (id, name, position) => ({ id, documentId: 'ph-' + id, name, position, incomes: [line(id * 10, name + ' i')], expenses: [line(id * 10 + 1, name + ' e')] })

const vm = () => ({
  phasesVisible: true,
  form: {
    date_end: '2026-12-31',
    project_original_phases: [budgetPhase(1, 'A', 0), budgetPhase(2, 'B', 1)],
    project_phases: [{ id: 5, name: 'Execució', position: 0, incomes: [], expenses: [] }]
  },
  deletedPhases: [],
  deletedIncomes: [],
  deletedExpenses: [],
  deletedHours: []
})

describe('ProjectForm copies a budget phase to the execution', () => {
  afterEach(() => vi.useRealTimers())

  it('copies the phase sent, whatever its index in the form', () => {
    vi.useFakeTimers()
    const c = vm()
    // the user moved B in front of A: B is now index 0 in ProjectPhases
    ProjectForm.methods.originalPhasesCopy.call(c, { index: 0, phase: c.form.project_original_phases[1] })
    const copy = c.form.project_phases.at(-1)
    expect(copy.name).toBe('B - còpia')
    expect(copy.incomes[0].concept).toBe('B i')
    expect(c.form._project_phases_updated).toBe(true)
  })

  it('makes new rows that go after the execution phases', () => {
    vi.useFakeTimers()
    const c = vm()
    ProjectForm.methods.originalPhasesCopy.call(c, { index: 1, phase: c.form.project_original_phases[1] })
    const copy = c.form.project_phases.at(-1)
    expect(copy.id).toBeUndefined()
    expect(copy.documentId).toBeUndefined()
    expect(copy.position).toBeUndefined()
    for (const sp of [...copy.incomes, ...copy.expenses]) {
      expect(sp.id).toBeUndefined()
      expect(sp.documentId).toBeUndefined()
      expect(sp.project_original_phase).toBeUndefined()
      expect(sp.dirty).toBe(true)
    }
    // the budget is untouched
    expect(c.form.project_original_phases[1].id).toBe(2)
  })

  it('still works with the index alone', () => {
    vi.useFakeTimers()
    const c = vm()
    ProjectForm.methods.originalPhasesCopy.call(c, { index: 0 })
    expect(c.form.project_phases.at(-1).name).toBe('A - còpia')
  })
})
