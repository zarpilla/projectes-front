// issues/015: a "9999" year showed up in the project's periodification with
// no explanation. It holds the amounts of lines with no date; the form now
// lists those lines, labels the row "Sense data", and drops it once it is
// empty and no line is undated.
import { describe, it, expect } from 'vitest'
import {
  dropEmptyUndatedRows,
  isUndatedYear,
  periodificationYearLabel,
  undatedProjectLines
} from '@/domain/projectPeriodification.js'

const form = phases => ({ project_phases: phases })

describe('undatedProjectLines', () => {
  it('lists income and expense lines with no date, zero-amount ones too', () => {
    const lines = undatedProjectLines(form([
      {
        name: 'Fase 1',
        incomes: [
          { id: 1, concept: 'Datada', quantity: 1, amount: 10, date: '2025-01-01' },
          { id: 2, concept: 'Buida', quantity: 0, amount: 0, date: null },
          { id: 3, concept: 'Doc', quantity: 1, amount: 5, date_estimate_document: '2025-02-01' }
        ],
        expenses: [{ id: 4, concept: 'Despesa', quantity: 2, amount: 3 }]
      }
    ]))
    expect(lines).toEqual([
      { id: 2, type: 'income', phase: 'Fase 1', concept: 'Buida', total_amount: 0 },
      { id: 4, type: 'expense', phase: 'Fase 1', concept: 'Despesa', total_amount: 6 }
    ])
  })

  it('is empty when every line has a date', () => {
    expect(undatedProjectLines(form([
      { name: 'F', incomes: [{ date: '2025-01-01' }], expenses: [{ date: '2025-05-01' }] }
    ]))).toEqual([])
    expect(undatedProjectLines(null)).toEqual([])
  })

  it('falls back to the backend list when phases are not loaded', () => {
    const undatedLines = [{ id: 9, type: 'income' }]
    expect(undatedProjectLines({ undatedLines })).toBe(undatedLines)
  })
})

describe('undated year label', () => {
  it('shows "Sense data" instead of 9999 or a junk year', () => {
    expect(periodificationYearLabel('9999')).toBe('Sense data')
    expect(periodificationYearLabel('Invalid date')).toBe('Sense data')
    expect(periodificationYearLabel('2025')).toBe('2025')
    expect(isUndatedYear(2025)).toBe(false)
  })
})

describe('dropEmptyUndatedRows', () => {
  const rows = () => [
    { year: '2025', incomes: 100, expenses: 0, real_incomes: 0, real_expenses: 0 },
    { year: '9999', incomes: 0, expenses: 0, real_incomes: 0, real_expenses: 0 },
    { year: '2026', incomes: -100, expenses: 0, real_incomes: 0, real_expenses: 0 }
  ]

  it('keeps the undated row while lines are undated', () => {
    expect(dropEmptyUndatedRows(rows(), true).map(r => r.year)).toEqual(['2025', '9999', '2026'])
  })

  it('drops an empty undated row once every line has a date', () => {
    expect(dropEmptyUndatedRows(rows(), false).map(r => r.year)).toEqual(['2025', '2026'])
  })

  it('keeps an undated row with amounts a user typed', () => {
    const r = rows()
    r[1].real_incomes = '-435'
    expect(dropEmptyUndatedRows(r, false).map(x => x.year)).toEqual(['2025', '9999', '2026'])
  })
})
