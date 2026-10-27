// issues/344: in a document's view, the project lines linked to that document
// are marked so they can be found without Ctrl+F.
// issues/345: the lines of a phase can be reordered with drag & drop, within
// their own table, and keep the saved order (`position`) when loaded again.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { sortLinesByPosition, moveLine, lineHasDocument, documentLineKind } from '@/domain/budgetLineOrder.js'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'

describe('budgetLineOrder', () => {
  it('sorts by position, lines without one after them in their order', () => {
    const lines = [{ id: 1 }, { id: 2, position: 1 }, { id: 3, position: null }, { id: 4, position: 0 }]
    expect(sortLinesByPosition(lines).map(l => l.id)).toEqual([4, 2, 1, 3])
  })

  it('moves a line up and down', () => {
    const lines = ['a', 'b', 'c', 'd']
    expect(moveLine(lines, 3, 1)).toBe(true)
    expect(lines).toEqual(['a', 'd', 'b', 'c'])
    expect(moveLine(lines, 0, 2)).toBe(true)
    expect(lines).toEqual(['d', 'b', 'a', 'c'])
    expect(moveLine(lines, 1, 1)).toBe(false)
    expect(moveLine(lines, 1, 9)).toBe(false)
  })

  it('matches a line to its document by kind, type and id', () => {
    const line = { invoice: { id: 537 } }
    expect(lineHasDocument(line, 'incomes', 'emitted-invoices', 537)).toBe(true)
    expect(lineHasDocument(line, 'incomes', 'emitted-invoices', '537')).toBe(true)
    expect(lineHasDocument(line, 'incomes', 'emitted-invoices', 538)).toBe(false)
    // a received invoice with the same id is another document
    expect(lineHasDocument(line, 'incomes', 'received-invoices', 537)).toBe(false)
    expect(lineHasDocument(line, 'expenses', 'received-invoices', 537)).toBe(true)
    expect(lineHasDocument({ diet: 4 }, 'expenses', 'diets', 4)).toBe(true)
    expect(lineHasDocument(line, 'incomes', 'emitted-invoices', null)).toBe(false)
    expect(documentLineKind('received-grants')).toBe('incomes')
    expect(documentLineKind('tickets')).toBe('expenses')
  })
})

describe('ProjectPhases line order and document line', () => {
  const projectPhases = () => [
    {
      id: 10,
      name: 'Fase',
      incomes: [
        { id: 100, concept: 'a', position: 2, invoice: { id: 5 } },
        { id: 101, concept: 'b', position: 0, invoice: { id: 537 } },
        { id: 102, concept: 'c', position: 1 }
      ],
      expenses: [{ id: 200, concept: 'x', invoice: { id: 537 } }]
    }
  ]

  const mountPhases = props =>
    shallowMount(ProjectPhases, {
      props: { form: { id: 1 }, projectPhases: projectPhases(), contacts: [], ...props },
      // the table cells are not under test (their slots need Buefy's row props)
      global: { plugins: [createPinia()], stubs: { 'b-table': { template: '<div />' } } }
    })

  const dragEvent = target => ({
    preventDefault: vi.fn(),
    target,
    dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() }
  })
  // a row whose handle says which line it is
  const rowTarget = index => ({
    closest: () => ({ querySelector: () => ({ getAttribute: () => String(index) }) })
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    get.mockResolvedValue({ data: [] })
  })

  it('shows the lines in their saved order', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    expect(wrapper.vm.phases[0].incomes.map(l => l.concept)).toEqual(['b', 'c', 'a'])
  })

  it('moves a dragged line within its table and reports the change', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    const phase = wrapper.vm.phases[0]
    wrapper.vm.lineDragStart(dragEvent(rowTarget(0)), phase, 'incomes', phase.incomes[2])
    const over = dragEvent(rowTarget(0))
    wrapper.vm.lineDragOver(over, phase, 'incomes')
    expect(over.preventDefault).toHaveBeenCalled()
    wrapper.vm.lineDrop(dragEvent(rowTarget(0)), phase, 'incomes')
    expect(phase.incomes.map(l => l.concept)).toEqual(['a', 'b', 'c'])
    expect(phase.incomes[0].dirty).toBe(true)
    const updates = wrapper.emitted('phases-updated')
    expect(updates[updates.length - 1][0].phases[0].incomes.map(l => l.concept)).toEqual(['a', 'b', 'c'])
  })

  it('does not drop a line into another table', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    const phase = wrapper.vm.phases[0]
    wrapper.vm.lineDragStart(dragEvent(rowTarget(0)), phase, 'incomes', phase.incomes[0])
    const over = dragEvent(rowTarget(0))
    wrapper.vm.lineDragOver(over, phase, 'expenses')
    expect(over.preventDefault).not.toHaveBeenCalled()
    wrapper.vm.lineDrop(dragEvent(rowTarget(0)), phase, 'expenses')
    expect(phase.expenses.map(l => l.concept)).toEqual(['x'])
    expect(phase.incomes.map(l => l.concept)).toEqual(['b', 'c', 'a'])
  })

  it('cannot reorder when not editable', async () => {
    const wrapper = mountPhases({ editable: false })
    await flushPromises()
    const phase = wrapper.vm.phases[0]
    wrapper.vm.lineDragStart(dragEvent(rowTarget(0)), phase, 'incomes', phase.incomes[2])
    expect(wrapper.vm.lineDrag).toBe(null)
  })

  it('marks the line of the document being viewed', async () => {
    const wrapper = mountPhases({ mode: 'incomes', documentId: 537, documentType: 'emitted-invoices' })
    await flushPromises()
    const phase = wrapper.vm.phases[0]
    expect(wrapper.vm.lineRowClass(phase.incomes[0], phase, 'incomes')).toContain('is-current-document')
    expect(wrapper.vm.lineRowClass(phase.incomes[1], phase, 'incomes')).not.toContain('is-current-document')
    // a received invoice 537 is not this document
    expect(wrapper.vm.lineRowClass(phase.expenses[0], phase, 'expenses')).not.toContain('is-current-document')
    expect(wrapper.vm.currentDocumentLineCount).toBe(1)
  })

  it('unfolds the phase of the document line when asked to go to it', async () => {
    const wrapper = mountPhases({ mode: 'incomes', documentId: 537, documentType: 'emitted-invoices' })
    await flushPromises()
    const phase = wrapper.vm.phases[0]
    wrapper.vm.toggleCollapsed(phase, 0)
    expect(wrapper.vm.isCollapsed(phase, 0)).toBe(true)
    wrapper.vm.goToDocumentLine()
    expect(wrapper.vm.isCollapsed(phase, 0)).toBe(false)
  })

  it('marks nothing outside a document view', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    const phase = wrapper.vm.phases[0]
    expect(wrapper.vm.lineRowClass(phase.incomes[0], phase, 'incomes')).toBe('')
    expect(wrapper.vm.currentDocumentLineCount).toBe(0)
  })
})
