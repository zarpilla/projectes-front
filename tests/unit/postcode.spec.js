// issues/179: 214 contacts of Diligència had a 4-digit postcode («8225
// Terrassa» for 08225): a spreadsheet dropped the leading zero when they were
// loaded in 2024, and the forms took any value.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import { postcodeInvalid, importedPostcode, isSpanish } from '@/domain/postcode'
import ContactsForm from '@/components/ContactsForm.vue'
import ContactsUserForm from '@/components/ContactsUserForm.vue'
import ImportExport from '@/views/ImportExport.vue'

describe('Spanish postcodes (issues/179)', () => {
  it('a Spanish one needs 5 digits; other countries keep theirs', () => {
    expect(postcodeInvalid('8225', null)).toBe(true)
    expect(postcodeInvalid('8225', 'Espanya')).toBe(true)
    expect(postcodeInvalid(' 08225 ', 'España')).toBe(false)
    expect(postcodeInvalid('1050', 'Belgique')).toBe(false)
    expect(isSpanish('Països Catalans')).toBe(true)
  })

  it('an import puts the dropped zero back, where a blank country is Spain', () => {
    expect(importedPostcode('8225')).toBe('08225')
    expect(importedPostcode(8225)).toBe('08225')
    expect(importedPostcode('08225')).toBe('08225')
    expect(importedPostcode('1050', 'Belgium')).toBe('1050')
    expect(importedPostcode('1040', '', { blankIsSpanish: false })).toBe('1040')
    expect(importedPostcode('8225', 'Catalunya', { blankIsSpanish: false })).toBe('08225')
  })

  it('the contacts import of Importa/Exporta pads only rows that say Spain', () => {
    const { prepareContactData } = ImportExport.methods
    expect(prepareContactData.call({}, { name: 'A', postcode: '8225', country: 'Espanya' }).postcode).toBe('08225')
    expect(prepareContactData.call({}, { name: 'B', postcode: '1040' }).postcode).toBe('1040')
  })

  it('the client form refuses a 4-digit Spanish postcode', () => {
    const error = form => ContactsForm.computed.postcodeError.call({ form })
    expect(error({ postcode: '8225', country: '' })).toBe(true)
    expect(error({ postcode: '08225', country: '' })).toBe(false)
    expect(error({ postcode: '1050', country: 'Belgique' })).toBe(false)
  })

  it('the delivery point form marks it as an error', () => {
    const errors = form => ContactsUserForm.computed.errors.call({ form, cities: [], slotErrors: [] })
    expect(errors({ postcode: '8225' }).postcode).toBe(true)
    expect(errors({ postcode: '08225' }).postcode).toBe(false)
  })
})
