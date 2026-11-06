// «Sèries de projecte» (2026-11-06): a series numbers the projects that take it,
// «[2026-001] Nom»; the form shows the code next to the text (the project's own
// number, or the series' next one), and the copy of a project takes the series
// it is given.
import { describe, it, expect } from 'vitest'
import {
  serieCode, serieIdOf, projectSerieCode, seriesOffered, withSerie, formName, copyNameFields
} from '@/domain/projectSeries'

const S2026 = { id: 3, name: '2026', prefix: '[', suffix: ']', leading_zeros: 3, last_number: 7, active: true }
const OLD = { id: 4, name: '2025', leading_zeros: 2, last_number: 40, active: false }

describe('project series', () => {
  it('writes the code like the invoice series, with an optional prefix and suffix', () => {
    expect(serieCode(S2026, 1)).toBe('[2026-001]')
    expect(serieCode({ name: '2026', leading_zeros: 3 }, 1)).toBe('2026-001')
    expect(serieCode({ name: 'P', prefix: '(', suffix: ')' }, 12)).toBe('(P-12)')
    expect(serieCode(S2026, 0)).toBe('')
  })

  it("shows the project's own number, or the next one when it is new or changes series", () => {
    const stored = { project_serie: { id: 3 }, serie_number: 2 }
    expect(projectSerieCode(S2026, { id: 10, project_serie: { id: 3 } }, stored)).toBe('[2026-002]')
    expect(projectSerieCode(S2026, { id: null, project_serie: { id: 3 } }, null)).toBe('[2026-008]')
    expect(projectSerieCode(S2026, { id: 10, project_serie: { id: 3 } }, { project_serie: { id: 4 }, serie_number: 2 })).toBe('[2026-008]')
  })

  it('offers the active series and the project\'s own', () => {
    expect(seriesOffered([S2026, OLD], 0).map(s => s.id)).toEqual([3])
    expect(seriesOffered([S2026, OLD], 4).map(s => s.id)).toEqual([3, 4])
  })

  it('a project entering a series takes its name as the text; leaving it, the text is the name', () => {
    const entering = withSerie({ name: 'Projecte antic', title: null, project_serie: { id: 0 } }, 3)
    expect(entering).toMatchObject({ title: 'Projecte antic', project_serie: { id: 3 } })
    const leaving = withSerie({ name: '[2026-002] Obra', title: 'Obra', project_serie: { id: 3 } }, 0)
    expect(leaving).toMatchObject({ name: 'Obra', project_serie: { id: 0 } })
    expect(serieIdOf(leaving)).toBe(0)
  })

  it('the name to validate needs the text', () => {
    expect(formName(S2026, { title: ' Obra ', project_serie: { id: 3 } }, null)).toBe('[2026-008] Obra')
    expect(formName(S2026, { title: '', project_serie: { id: 3 } }, null)).toBe('')
    expect(formName(null, { name: 'Lliure' }, null)).toBe('Lliure')
  })

  it('the copy: into a series the text with a new number, without one «(còpia)»', () => {
    const numbered = { name: '[2026-002] Obra', title: 'Obra', project_serie: { id: 3 }, serie_number: 2 }
    expect(copyNameFields(numbered, 4)).toEqual({ project_serie: { id: 4 }, serie_number: null, title: 'Obra', name: 'Obra' })
    expect(copyNameFields(numbered, 0)).toEqual({ project_serie: { id: 0 }, serie_number: null, title: null, name: 'Obra (còpia)' })
    expect(copyNameFields({ name: 'Lliure', project_serie: { id: 0 } }, 0).name).toBe('Lliure (còpia)')
    expect(copyNameFields({ name: 'Lliure', project_serie: { id: 0 } }, 3)).toMatchObject({ title: 'Lliure', project_serie: { id: 3 } })
  })
})
