// issues/189: an accepted quote opened as a blank page. DocumentForm gave the
// API's «2026-06-29» string to the «Data d'acceptació» datepicker
// (focusedDate.getDate is not a function): accepted_date was the only picker
// date not turned into a Date on load.
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { documentDatesForPickers, documentDatesForApi, DOCUMENT_PICKER_DATES } from '@/domain/documentDates'

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

// issues/229: east of Madrid (Asia/Tokyo) every save of a quote moved its
// dates back one day: the form sent local midnight as UTC, which the API reads
// in Europe/Madrid. They now go out as the local day, «YYYY-MM-DD», which must
// not change anything in Madrid or west of it either.
describe('documentDatesForApi (issues/229)', () => {
  const zones = ['Asia/Tokyo', 'Pacific/Kiritimati', 'Europe/Madrid', 'Europe/London', 'America/New_York', 'Pacific/Honolulu']
  const original = process.env.TZ
  afterEach(() => { process.env.TZ = original })

  for (const zone of zones) {
    it(`sends the picked day in ${zone}`, () => {
      process.env.TZ = zone
      const form = documentDatesForPickers({
        emitted: '2026-07-23',
        accepted_date: '2026-08-15',
        paybefore: null,
        code: '2026-004',
        lines: [{ concept: 'Dieta', date: new Date(2026, 0, 1) }, { concept: 'Hores' }]
      })
      const sent = documentDatesForApi(form)
      expect(sent).toMatchObject({ emitted: '2026-07-23', accepted_date: '2026-08-15', paybefore: null, code: '2026-004' })
      expect(sent.lines).toEqual([{ concept: 'Dieta', date: '2026-01-01' }, { concept: 'Hores' }])
      // what JSON carries is the same day, whatever the zone
      expect(JSON.parse(JSON.stringify(sent)).emitted).toBe('2026-07-23')
      // the form keeps its Dates for the pickers
      expect(form.emitted).toBeInstanceOf(Date)
      expect(form.lines[0].date).toBeInstanceOf(Date)
    })
  }

  it('leaves the lines as they are when none has a Date', () => {
    const lines = [{ concept: 'A' }]
    expect(documentDatesForApi({ lines }).lines).toBe(lines)
  })
})
