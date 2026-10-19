// issues/189: an accepted quote opened as a blank page. DocumentForm gave the
// API's «2026-06-29» string to the «Data d'acceptació» datepicker
// (focusedDate.getDate is not a function): accepted_date was the only picker
// date not turned into a Date on load.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { documentDatesForPickers, DOCUMENT_PICKER_DATES } from '@/domain/documentDates'

describe('documentDatesForPickers (issues/189)', () => {
  it('turns the accepted date of a quote into a local date', () => {
    const form = documentDatesForPickers({ accepted_date: '2026-06-29', emitted: '2026-06-01', code: '2026-004' })
    expect(form.accepted_date).toBeInstanceOf(Date)
    expect([form.accepted_date.getFullYear(), form.accepted_date.getMonth(), form.accepted_date.getDate()]).toEqual([2026, 5, 29])
    expect(form.emitted).toBeInstanceOf(Date)
    expect(form.code).toBe('2026-004')
  })

  it('leaves empty dates empty, and Dates as they are', () => {
    const d = new Date(2026, 0, 2)
    const form = documentDatesForPickers({ accepted_date: null, sent_date: '', paid_date: d })
    expect(form.accepted_date).toBeNull()
    expect(form.sent_date).toBe('')
    expect(form.paid_date).toBe(d)
  })

  it('covers every date a DocumentForm datepicker edits', () => {
    const source = readFileSync(resolve(__dirname, '../../src/components/DocumentForm.vue'), 'utf8')
    const pickers = source.match(/<b-datepicker[^>]*>/gs) || []
    const fields = pickers
      .map(tag => (tag.match(/v-model="form\.(\w+)"/) || [])[1])
      .filter(Boolean)
    expect(fields.length).toBeGreaterThan(5)
    for (const field of fields) expect(DOCUMENT_PICKER_DATES).toContain(field)
  })
})
