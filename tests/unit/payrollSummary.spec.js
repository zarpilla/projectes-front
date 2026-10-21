// Persones › «Crear bestretes»: the warning next to a total that is not 12 now
// says which months have no advance and why.
import { describe, it, expect } from 'vitest'
import { missingPayrollsText, payrollTotal } from '@/domain/payrollSummary.js'

describe('missingPayrollsText', () => {
  it('says nothing for a full year', () => {
    expect(missingPayrollsText({ created: 4, existing: 8, skipped: [] })).toBe('')
  })

  it('groups consecutive months with the same reason', () => {
    const skipped = [
      { month: 1, reason: 'no-period' }, { month: 2, reason: 'no-period' },
      ...[7, 8, 9, 10, 11, 12].map(month => ({ month, reason: 'zero-hours' }))
    ]
    expect(missingPayrollsText({ created: 4, existing: 0, skipped })).toBe(
      "Té 4 de 12 bestretes. Sense bestreta: gener–febrer: cap període de jornada l'últim dia del mes; " +
      'juliol–desembre: jornada de 0 h (sense jornada activa).'
    )
  })

  it('names a single month alone and splits a gap', () => {
    const skipped = [{ month: 3, reason: 'zero-hours' }, { month: 5, reason: 'zero-hours' }]
    expect(missingPayrollsText({ created: 10, existing: 0, skipped }))
      .toBe('Té 10 de 12 bestretes. Sense bestreta: març: jornada de 0 h (sense jornada activa); maig: jornada de 0 h (sense jornada activa).')
  })

  it('explains the rule when the backend gives no months', () => {
    expect(missingPayrollsText({ created: 0, existing: 0 }))
      .toBe("Té 0 de 12 bestretes. Només es creen els mesos amb una jornada de més de 0 h l'últim dia del mes.")
  })

  it('warns about repeated advances', () => {
    expect(missingPayrollsText({ created: 0, existing: 13, skipped: [] })).toContain('repetides')
  })

  it('adds created and existing', () => {
    expect(payrollTotal({ created: 11, existing: 1 })).toBe(12)
  })
})
