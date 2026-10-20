// issues/252: «Punt més baix previst … a final de gener» was January of the
// next year, beyond the table, without saying so.
import { describe, it, expect } from 'vitest'
import TresoreriaTable from '@/components/TresoreriaTable.vue'

const label = lowestMonth => TresoreriaTable.computed.lowestMonthLabel.call({ lowestMonth, monthName: TresoreriaTable.methods.monthName })

describe('lowest forecast month label (issues/252)', () => {
  it('says the year', () => {
    expect(label({ month: '01', year: '2027' })).toBe('a final de gener de 2027')
    expect(label({ month: '10', year: '2026' })).toBe("a final d'octubre de 2026")
  })

  it('without forecast months', () => {
    expect(label(null)).toBe('sense mesos previstos')
  })
})
