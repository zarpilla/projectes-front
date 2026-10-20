// issues/212 (redesign review 4, 2026-10-19): project screens slips.
// - Project › Dades with Final 01/01/2025 and Inici 01/01/2026 saved as «Guardat».
// - The list footer said «Total · 1 projectes».
// - Save errors said «son dades obligatòries» (ProjectForm, DocumentForm).
// - An empty Codi showed the browser's English «Please fill out this field.».
// - Projects «Exporta» had the row keys as headers and ISO dates.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import Home from '@/views/Home.vue'
import MotherProjectsList from '@/views/MotherProjectsList.vue'
import ProjectsTable from '@/components/ProjectsTable.vue'
import { projectBasicDataError, PROJECT_DATES_MESSAGE, PROJECT_REQUIRED_MESSAGE } from '@/domain/projectBasicData'

const read = f => fs.readFileSync(path.resolve(process.cwd(), f), 'utf8')
const form = over => ({
  name: 'P', project_state: { id: 1 }, project_scope: { id: 2 }, leader: { id: 3 },
  date_start: new Date(2026, 0, 1), date_end: new Date(2026, 11, 31), ...over
})

describe('project basic data (issues/212)', () => {
  it('refuses an end date before the start', () => {
    expect(projectBasicDataError(form({ date_end: new Date(2025, 0, 1) }))).toBe(PROJECT_DATES_MESSAGE)
  })
  it('accepts the same day and later ends', () => {
    expect(projectBasicDataError(form())).toBe(null)
    expect(projectBasicDataError(form({ date_end: new Date(2026, 0, 1, 0, 0) , date_start: new Date(2026, 0, 1, 15, 0) }))).toBe(null)
  })
  it('says «són» for the required fields', () => {
    expect(projectBasicDataError(form({ name: '' }))).toBe(PROJECT_REQUIRED_MESSAGE)
    expect(projectBasicDataError(form({ leader: { id: 0 } }))).toMatch(/ són dades obligatòries$/)
  })
  it('the form uses it and has no browser bubble', () => {
    const src = read('src/views/ProjectForm.vue')
    expect(src).toMatch(/projectBasicDataError\(this\.form\)/)
    expect(src).toMatch(/<form\s+novalidate/)
    expect(src).toMatch(/placeholder="Codi" required :validation-message=/)
    expect(src).not.toMatch(/ son dades obligatòries/)
    expect(read('src/components/DocumentForm.vue')).not.toMatch(/ son dades obligatòries/)
  })
})

describe('projects list footer (issues/212)', () => {
  it('is singular for one project', () => {
    const { totalLabel } = ProjectsTable.computed
    expect(totalLabel.call({ projectsData: [{}] })).toBe('Total · 1 projecte')
    expect(totalLabel.call({ projectsData: [{}, {}] })).toBe('Total · 2 projectes')
  })
})

describe('projects export (issues/212)', () => {
  const project = {
    id: 1, name: 'P', date_start: '2019-09-02', date_end: '2020-01-31',
    project_state: { id: 1, name: 'Actiu' }, total_real_expenses_vat: 2
  }
  for (const [view, data] of [[Home, { projects: [project] }], [MotherProjectsList, { motherProjects: [project] }]]) {
    it(`${view.name || 'view'}: dd/mm/yyyy dates and Catalan headers for every column`, () => {
      const rows = view.computed.projectsCSV.call(data)
      expect(rows[0].date_start).toBe('02/09/2019')
      expect(rows[0].date_end).toBe('31/01/2020')
      const fields = view.computed.projectsExportFields.call({ projectsCSV: rows })
      expect(Object.values(fields).sort()).toEqual(Object.keys(rows[0]).sort())
      expect(fields['Data inici']).toBe('date_start')
      expect(Object.keys(fields)).not.toContain('estimated_hours')
    })
  }
})
