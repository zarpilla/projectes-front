// issues/102: Tresoreria showed an «Invalid date» year for undated movements,
// «-, amb els previstos pendents» for an account without a name, a month name
// capitalised in a sentence, and its zero line across the chart title when
// every month was negative.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import { treasuryPeriod } from '@/domain/projectTreasury.js'
import TresoreriaTable from '@/components/TresoreriaTable.vue'

const c = TresoreriaTable.computed

describe('Tresoreria labels (issues/102)', () => {
  it('groups undated movements as «Sense data»', () => {
    expect(treasuryPeriod('20261017')).toEqual({ year: '2026', month: '10', ym: '202610' })
    expect(treasuryPeriod(null)).toEqual({ year: 'Sense data', month: '—', ym: '' })
    expect(treasuryPeriod('Invalid date')).toEqual({ year: 'Sense data', month: '—', ym: '' })
  })

  it('names the undated row of the monthly table', () => {
    expect(TresoreriaTable.methods.monthName('99')).toBe('Sense data')
    expect(TresoreriaTable.methods.monthName('03')).toBe('Març')
  })

  it('names the scope of «Saldo avui»', () => {
    expect(c.todayBalanceScope.call({ isSingleAccountView: false })).toBe('suma dels comptes')
    expect(c.todayBalanceScope.call({ isSingleAccountView: true, singleAccountName: 'Triodos' })).toBe('Triodos')
    expect(c.todayBalanceScope.call({ isSingleAccountView: true, singleAccountName: '-' })).toBe('el compte')
  })

  it('keeps the zero line inside the bars area', () => {
    expect(c.zeroPos.call({ chartRange: { max: 0, min: -100 } })).toBe('calc((100% - 3rem) * 1)')
    expect(c.zeroPos.call({ chartRange: { max: 100, min: 0 } })).toBe('calc((100% - 3rem) * 0)')
  })
})
