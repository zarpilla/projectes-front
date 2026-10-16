// Catalan number format used by the redesigned screens (docs/redisseny-v2)
import { describe, it, expect } from 'vitest'
import { formatNumber, formatHours, formatMoney, sign } from '@/helpers/format-number'

describe('formatNumber', () => {
  it('groups thousands with dots, also with 4 digits', () => {
    expect(formatNumber(2442.5)).toBe('2.442,5')
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(999)).toBe('999')
  })

  it('drops trailing zero decimals down to the minimum', () => {
    expect(formatNumber(9.5, 2)).toBe('9,5')
    expect(formatNumber(10, 2)).toBe('10')
    expect(formatNumber(10, 2, 2)).toBe('10,00')
  })

  it('uses the minus sign and never prints −0', () => {
    expect(formatNumber(-473.72, 2)).toBe('−473,72')
    expect(formatNumber(-0.001, 2)).toBe('0')
  })

  it('returns an empty string for non-numbers', () => {
    expect(formatNumber(undefined)).toBe('')
    expect(formatNumber('abc')).toBe('')
  })

  it('rounds float noise (the periodification showed 1163.6000000000022)', () => {
    expect(formatNumber(1163.6000000000022, 2, 2)).toBe('1.163,60')
  })
})

describe('formatHours / formatMoney / sign', () => {
  it('formats hours and money', () => {
    expect(formatHours(5588.4)).toBe('5.588,4 h')
    expect(formatMoney(-78629.82)).toBe('−78.629,82 €')
    expect(formatMoney(null)).toBe('0,00 €')
  })

  it('classifies amounts by sign at cent precision', () => {
    expect(sign(12)).toBe('pos')
    expect(sign(-0.4)).toBe('neg')
    expect(sign(0.004)).toBe('zero')
  })
})
