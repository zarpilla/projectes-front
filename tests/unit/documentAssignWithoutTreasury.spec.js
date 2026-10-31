import { describe, it, expect } from 'vitest'
import DocumentForm from '@/components/DocumentForm.vue'

const { validateIfProjectPhasesHasDocument } = DocumentForm.methods

// An invoice whose project line is not assigned to it.
const ctx = (me) => ({
  me,
  type: 'emitted-invoices',
  form: { id: 7, projects: [{ project_phases: [{ incomes: [{ invoice: null }] }] }] }
})

describe('DocumentForm line assignment check', () => {
  it('blocks an unassigned invoice when treasury is on', () => {
    expect(validateIfProjectPhasesHasDocument.call(ctx({ options: { treasury: true } }))).toBe(false)
  })

  it('lets it through when treasury is off (no «Fact.»/«Doc» columns)', () => {
    expect(validateIfProjectPhasesHasDocument.call(ctx({ options: { treasury: false } }))).toBe(true)
    expect(validateIfProjectPhasesHasDocument.call(ctx({ options: {} }))).toBe(true)
  })
})
