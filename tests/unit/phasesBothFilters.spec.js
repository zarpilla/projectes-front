// issues/309: Informes › Dedicació downloaded every year of logged hours of
// every project (6.4 MB on resilience) and filtered them in the browser. The
// server now filters them: the report sends the year, person and project.
import { describe, it, expect } from 'vitest'
import { phasesBothFilters } from '@/domain/phasesBothFilters'

describe('phases-both filters (issues/309)', () => {
  it('sends the chosen year, person and project', () => {
    expect(phasesBothFilters({ year: 2026, person: 7, project: 12 })).toBe('&year=2026&user=7&project=12')
  })

  it('leaves out what is «all» (0 or empty)', () => {
    expect(phasesBothFilters({ year: 0, person: 0, project: 0 })).toBe('')
    expect(phasesBothFilters({ year: 2026, person: null, project: undefined })).toBe('&year=2026')
    expect(phasesBothFilters()).toBe('')
  })
})
