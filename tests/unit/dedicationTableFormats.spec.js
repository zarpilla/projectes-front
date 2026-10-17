// issues/127: the «Taula» view of Hores dedicades wrote hours with a decimal
// point and capitalised every word of the day row: «1.00 H», «Dimarts
// 30/06/2026 (D'aquí 13 Dies)». The calendar view writes «8,25 h».
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import moment from 'moment'
import 'moment/dist/locale/ca'
import DedicationInput from '@/components/DedicationInput.vue'

describe('Hores dedicades table formats (issues/127)', () => {
  it('writes hours in Catalan format with two decimals', () => {
    const label = DedicationInput.methods.hoursLabel
    expect(label(1)).toBe('1,00 h')
    expect(label(0.5)).toBe('0,50 h')
    expect(label(1234.25)).toBe('1.234,25 h')
    expect(label(null)).toBe('0,00 h')
  })
  it('capitalises only the first letter of the day title', () => {
    moment.locale('ca')
    const title = DedicationInput.methods.formatTitle(moment().add(13, 'days').format('YYYY-MM-DD'))
    expect(title.charAt(0)).toBe(title.charAt(0).toUpperCase())
    expect(title).toMatch(/\(d'aquí \d+ dies\)$/)
  })
})

describe('project documents dates (issues/127)', async () => {
  const { default: ProjectForm } = await import('@/views/ProjectForm.vue')
  it('writes dd/mm/aaaa and nothing for an empty date', () => {
    expect(ProjectForm.methods.formatDate('2025-05-13')).toBe('13/05/2025')
    expect(ProjectForm.methods.formatDate(null)).toBe('')
  })
})

describe('other formats (issues/127)', async () => {
  const { default: ProjectSummaryCards } = await import('@/components/ProjectSummaryCards.vue')
  const { default: PrevisioTable } = await import('@/components/PrevisioTable.vue')
  it('project summary hours keep two decimals', () => {
    expect(ProjectSummaryCards.methods.hours(3307.6)).toBe('3.307,60 h')
    expect(ProjectSummaryCards.methods.hours(3574.33)).toBe('3.574,33 h')
  })
  it('Previsió econòmica names a single year once', () => {
    const span = rows => PrevisioTable.computed.yearSpan.call({ yearRows: rows })
    expect(span([{ year: 2026 }])).toBe('2026')
    expect(span([{ year: 2026 }, { year: 2027 }, { year: 2028 }])).toBe('2026–2028')
    expect(span([])).toBe('')
  })
})
