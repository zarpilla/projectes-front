// issues/016: saving a document sent its projects whole (every phase, budget
// line and estimated hour) inside the document — a 459 KB upload for an invoice
// of a large project. The document only stores which projects it belongs to;
// the phases are saved by their own request, from the form's untouched copy.
import { describe, it, expect } from 'vitest'
import { documentPayload } from '@/domain/documentPayload.js'

const project = id => ({
  id,
  documentId: `doc${id}`,
  name: `Project ${id}`,
  project_phases: [{ id: id * 10, incomes: [{ id: id * 100, assign: true, invoice: null }], expenses: [] }],
  project_phases_info: { deletedPhases: [], deletedIncomes: [], deletedExpenses: [], deletedHours: [] }
})

describe('documentPayload', () => {
  it('sends the projects as references', () => {
    const form = { id: 5, comments: 'x', lines: [{ base: 10, quantity: 1 }], projects: [project(1), project(2)] }
    expect(documentPayload(form).projects).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('leaves every other field as it is', () => {
    const form = { id: 5, comments: 'x', contact: { id: 3, name: 'C' }, lines: [{ base: 10, quantity: 1 }], projects: [project(1)] }
    const { projects, ...rest } = documentPayload(form)
    const { projects: formProjects, ...formRest } = form
    expect(rest).toEqual(formRest)
    expect(rest.lines).toBe(form.lines)
  })

  it('does not touch the form: its phases are saved afterwards from it', () => {
    const form = { projects: [project(1)] }
    const before = JSON.parse(JSON.stringify(form))
    documentPayload(form)
    expect(form).toEqual(before)
    expect(form.projects[0].project_phases[0].incomes[0].assign).toBe(true)
  })

  it('keeps projects that are already references, or not set', () => {
    expect(documentPayload({ projects: [{ id: 4 }, 7, null] }).projects).toEqual([{ id: 4 }, 7, null])
    expect(documentPayload({ projects: [] }).projects).toEqual([])
  })

  it('returns forms without a project list unchanged (payrolls)', () => {
    const form = { id: 1, total: 3 }
    expect(documentPayload(form)).toBe(form)
    expect(documentPayload({ projects: null })).toEqual({ projects: null })
  })
})
