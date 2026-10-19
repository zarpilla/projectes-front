// issues/205: projects without a state never appeared in Ingressos/Despeses and
// Preu hora; both reports now offer a «Sense estat» chip (id 0 for the API).
import { describe, it, expect } from 'vitest'
import { stateChips, NO_STATE_ID } from '@/domain/projectStateChips'

describe('«Estat projecte» chips (issues/205)', () => {
  it('adds «Sense estat» after the states', () => {
    expect(stateChips([{ id: 1, name: 'En curs' }])).toEqual([
      { id: 1, name: 'En curs' },
      { id: 0, name: 'Sense estat' }
    ])
    expect(NO_STATE_ID).toBe(0)
  })
})
