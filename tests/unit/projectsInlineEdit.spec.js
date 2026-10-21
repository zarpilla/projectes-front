// Inline editing in the projects table («Edita» mode): the pencil turned into a
// save button and there was no way to cancel; the actions column also fell off
// the right edge, so neither was visible. Now a row being edited shows «Desa»
// and «Cancel·la», Esc cancels and Enter in the name saves.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import Buefy from 'buefy'

const put = vi.fn(() => Promise.resolve({ data: {} }))
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put }) }))
import ProjectsTable from '@/components/ProjectsTable.vue'

const project = { id: 7, name: 'B00-FORK2PEACE', leader: null, project_state: { id: 1, name: 'Actiu' }, date_start: '2026-01-01', date_end: '2026-06-30' }

function mountTable () {
  return mount(ProjectsTable, {
    props: { projects: [project], editMode: true, projectStates: [{ id: 1, name: 'Actiu' }] },
    global: { plugins: [Buefy], stubs: { RouterLink: RouterLinkStub } },
    attachTo: document.body
  })
}

const button = (w, title) => w.find(`button[title="${title}"]`)

async function startEditing (w) {
  // the watcher copies `projects` into the table data
  await w.setProps({ projects: [{ ...project }] })
  await button(w, 'Edita').trigger('click')
}

beforeEach(() => put.mockClear())

describe('projects table inline edit', () => {
  it('shows «Desa» and «Cancel·la» while a row is edited', async () => {
    const w = mountTable()
    await startEditing(w)
    expect(button(w, 'Desa').exists()).toBe(true)
    expect(button(w, 'Cancel·la').exists()).toBe(true)
    expect(button(w, 'Edita').exists()).toBe(false)
  })

  it('«Cancel·la» drops the changes without saving', async () => {
    const w = mountTable()
    await startEditing(w)
    await w.find('td input').setValue('Canviat')
    await button(w, 'Cancel·la').trigger('click')
    expect(put).not.toHaveBeenCalled()
    expect(w.find('td input').exists()).toBe(false)
    expect(w.text()).toContain('B00-FORK2PEACE')
  })

  it('Esc cancels the edit', async () => {
    const w = mountTable()
    await startEditing(w)
    await w.find('td input').trigger('keydown', { key: 'Escape' })
    expect(put).not.toHaveBeenCalled()
    expect(button(w, 'Edita').exists()).toBe(true)
  })

  it('«Desa» and Enter in the name save the row', async () => {
    const w = mountTable()
    await startEditing(w)
    await w.find('td input').setValue('Canviat')
    await button(w, 'Desa').trigger('click')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('projects/7', expect.objectContaining({ name: 'Canviat' }))

    await button(w, 'Edita').trigger('click')
    await w.find('td input').setValue('Altre')
    await w.find('td input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(put).toHaveBeenLastCalledWith('projects/7', expect.objectContaining({ name: 'Altre' }))
  })
})

describe('projects table inline edit size', () => {
  it('uses small controls in the row being edited', async () => {
    const w = mountTable()
    await startEditing(w)
    const row = w.find('tbody tr')
    expect(row.find('.control.is-small input').exists()).toBe(true)
    // the five dropdowns, plus the month/year ones of the two calendars
    expect(row.findAll('.select').length).toBeGreaterThanOrEqual(5)
    expect(row.findAll('.select:not(.is-small)').length).toBe(0)
    expect(row.findAll('.inline-date').length).toBe(2)
  })
})
