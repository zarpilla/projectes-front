// issues/124: the contact form gave the partner contribution date to a Buefy
// datepicker as the API's string («2024-03-15»): «focusedDate.getDate is not a
// function» and an empty form for every partner with that date.
import { describe, it, expect } from 'vitest'
import { contactDatesForPickers } from '@/domain/contactDates'

describe('contactDatesForPickers (issues/124)', () => {
  it('turns the date fields the datepickers edit into local dates', () => {
    const form = contactDatesForPickers({ partner_amount_date: '2024-03-15', followup_date: '2026-10-01', name: 'x' })
    expect(form.partner_amount_date).toBeInstanceOf(Date)
    expect([form.partner_amount_date.getFullYear(), form.partner_amount_date.getMonth(), form.partner_amount_date.getDate()]).toEqual([2024, 2, 15])
    expect(form.followup_date).toBeInstanceOf(Date)
    expect(form.followup_date.getDate()).toBe(1)
    expect(form.name).toBe('x')
  })
  it('leaves empty dates empty', () => {
    const form = contactDatesForPickers({ partner_amount_date: null, followup_date: '' })
    expect(form.partner_amount_date).toBeNull()
    expect(form.followup_date).toBe('')
  })
})
