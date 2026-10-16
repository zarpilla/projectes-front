// The pivot reports showed Kendo's en-US numbers ("20,262.51") among the app's
// Catalan ones ("20.262,51"): applyKendoCulture adds and selects a ca-ES culture.
import { describe, it, expect } from 'vitest'
import { applyKendoCulture } from '@/helpers/kendoCulture.js'

const fakeKendo = () => {
  const enUS = {
    name: 'en-US',
    numberFormat: {
      pattern: ['-n'], decimals: 2, ',': ',', '.': '.', groupSize: [3],
      percent: { pattern: ['-n %', 'n %'], decimals: 2, ',': ',', '.': '.', groupSize: [3], symbol: '%' },
      currency: { pattern: ['($n)', '$n'], decimals: 2, ',': ',', '.': '.', groupSize: [3], symbol: '$' }
    },
    calendars: { standard: { name: 'Gregorian' } }
  }
  const kendo = { cultures: { 'en-US': enUS }, current: 'en-US' }
  kendo.culture = name => { kendo.current = name }
  return kendo
}

describe('applyKendoCulture', () => {
  it('adds a ca-ES culture with "." for thousands and "," for decimals and selects it', () => {
    const kendo = fakeKendo()
    expect(applyKendoCulture(kendo)).toBe(true)
    const ca = kendo.cultures['ca-ES']
    expect([ca.numberFormat[','], ca.numberFormat['.']]).toEqual(['.', ','])
    expect([ca.numberFormat.currency[','], ca.numberFormat.currency['.'], ca.numberFormat.currency.symbol]).toEqual(['.', ',', '€'])
    expect(ca.calendars).toBe(kendo.cultures['en-US'].calendars)
    expect(kendo.current).toBe('ca-ES')
    // en-US itself is left as it was
    expect(kendo.cultures['en-US'].numberFormat[',']).toBe(',')
  })

  it('does nothing before Kendo is loaded', () => {
    expect(applyKendoCulture(undefined)).toBe(false)
  })
})
