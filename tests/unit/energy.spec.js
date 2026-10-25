// Comunitat energètica (2026-10-25): CUPS check, formats, the coefficients file
// and the members' search of views/Energy*.vue.
import { describe, it, expect } from 'vitest'
import {
  normalizeCups,
  checkCups,
  formatCups,
  formatCoefficient,
  formatShare,
  coefficientError,
  parseCoefficient,
  distributionSum,
  kwOf,
  coefficientsFile,
  filterPartners,
  isActivePartner
} from '@/domain/energy'

// 0000000000000001 mod 529 = 1 → «TR» (made up)
const GOOD = 'ES0000000000000001TR'

describe('energy CUPS', () => {
  it('normalizes and checks the control letters like the API', () => {
    expect(normalizeCups(' es 0000 0000 0000 0001 tr ')).toBe(GOOD)
    expect(normalizeCups(`${GOOD}OF`)).toBe(`${GOOD}0F`)
    expect(checkCups(`${GOOD}0F`).valid).toBe(true)
    expect(checkCups('ES0000000000000001TT').reason).toContain('TR')
    expect(checkCups('ES023001029837417MJ').valid).toBe(false)
    expect(checkCups('').reason).toBe('Falta el CUPS')
  })

  it('shows a CUPS in groups', () => {
    expect(formatCups(`${GOOD}0F`)).toBe('ES 0000 0000 0000 0001 TR0F')
  })
})

describe('energy coefficients', () => {
  it('formats 6 decimals and percentages', () => {
    expect(formatCoefficient(0.0523)).toBe('0,052300')
    expect(formatShare(0.0523)).toBe('5,23 %')
    expect(formatCoefficient(null)).toBe('—')
  })

  it('reads commas and checks the range', () => {
    expect(parseCoefficient('0,25')).toBe(0.25)
    expect(parseCoefficient('')).toBe(null)
    expect(coefficientError('')).toBe('Falta el coeficient')
    expect(coefficientError('abc')).toBe('Ha de ser un número')
    expect(coefficientError('1,5')).toBe('Ha de ser entre 0 i 1')
    expect(coefficientError('0,5')).toBe(null)
  })

  it('adds up a distribution and gives the kW', () => {
    expect(distributionSum([{ coefficient: '0,1' }, { coefficient: 0.2 }, { coefficient: 'x' }])).toBe(0.3)
    expect(kwOf('0,25', '40.00')).toBe(10)
    expect(kwOf('0,25', null)).toBe(null)
  })

  it('writes the CUPS;coefficient file, leaving out zeros', () => {
    expect(coefficientsFile([
      { cups: GOOD, coefficient: 0.25 },
      { cups: 'es0000000000000001tr0f', coefficient: 0.0523 },
      { cups: GOOD, coefficient: 0 }
    ])).toBe(`${GOOD};0,250000\r\n${GOOD}0F;0,052300`)
  })
})

describe('energy members', () => {
  const partners = [
    { name: 'Neus Àlvarez', nif: '1A', supplies: [{ cups: GOOD }] },
    { name: 'Pere', email: 'pere@x.cat', supplies: [], leave_date: '2026-01-31' }
  ]

  it('searches by name without accents, email and CUPS', () => {
    expect(filterPartners(partners, 'alvarez').map(p => p.name)).toEqual(['Neus Àlvarez'])
    expect(filterPartners(partners, 'pere@').map(p => p.name)).toEqual(['Pere'])
    expect(filterPartners(partners, '0000 0001').map(p => p.name)).toEqual(['Neus Àlvarez'])
    expect(filterPartners(partners, '')).toHaveLength(2)
  })

  it('a member with a past leave date is no longer active', () => {
    expect(isActivePartner(partners[1], '2026-10-25')).toBe(false)
    expect(isActivePartner(partners[1], '2026-01-31')).toBe(true)
    expect(isActivePartner(partners[0], '2026-10-25')).toBe(true)
  })
})
