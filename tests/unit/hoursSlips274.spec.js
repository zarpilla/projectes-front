// issues/274 (review 8): small slips of the hours screens.
// - Registre jornades PDF listed the days as 2026-10-19 and the month total
//   «3 H 30» (.is-total capitalized it).
// - % Dedicació real and Hores dedicades «Exporta» used the raw keys
//   (project_name, username, hours, date, month, year) and ISO dates.
// - A festive range asked «estàs a punt de crear 8 festius» and saved 6
//   (weekends skipped).
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
vi.mock('@/domain/currentUser', () => ({ findCurrentUser: users => users[0] }))
vi.mock('html3pdf', () => ({ default: () => ({}) }))
import JornadaDiaria from '@/components/JornadaDiaria.vue'
import jornadaSource from '@/components/JornadaDiaria.vue?raw'
import ModalBoxFestive from '@/components/ModalBoxFestive.vue'
import { realDedicationFields, dedicatedHoursFields } from '@/domain/hoursExport.js'
import { festiveRangeDates, workdayRegisterMonths } from '@/domain/workdayLog.js'
import { buildOds } from '@/service/ods'
import { unzipSync, strFromU8 } from 'fflate'

// what vue-json-excel writes for one row with `fields`
const exportRow = (fields, row) =>
  Object.fromEntries(Object.entries(fields).map(([label, f]) => {
    if (typeof f === 'string') return [label, row[f]]
    return [label, f.callback(row[f.field], row)]
  }))

describe('Registre jornades PDF (issues/274)', () => {
  // the PDF was redrawn like the invoices (2026-10-28): its rows come from
  // workdayRegisterMonths and the month total no longer uses .is-total
  it('lists the days as dd/mm/yyyy', () => {
    const [month] = workdayRegisterMonths([{ date: '2026-10-19', hour_in: '09:00', hour_out: '12:00' }])
    expect(month.days[0].label).toBe('19/10/2026')
  })
  it('does not capitalize the month total', () => {
    expect(jornadaSource).toMatch(/class="wr-row wr-month"/)
    expect(jornadaSource).not.toMatch(/\.wr-month[^}]*text-transform: (capitalize|uppercase)/)
  })
})

describe('hours exports (issues/274)', () => {
  it('% Dedicació real: Catalan headers and dd/mm/yyyy', () => {
    const row = { project_name: 'P', username: 'anna', hours: 2.5, date: '2026-10-19', month: '10', year: 2026 }
    expect(exportRow(realDedicationFields, row)).toEqual({
      Projecte: 'P', Persona: 'anna', Hores: 2.5, Data: '19/10/2026', Mes: '10', Any: 2026
    })
  })
  it('Hores dedicades: Catalan headers and dd/mm/yyyy', () => {
    const row = { date: '2026-10-19', project: 'P', username: 'anna', hours: 1, description: 'd', activity: 'a', type: 't', client: 'c' }
    const out = exportRow(dedicatedHoursFields, row)
    expect(Object.keys(out)).toEqual(['Data', 'Projecte', 'Persona', 'Hores', 'Descripció', 'Funció', 'Tipus de dedicació', 'Client'])
    expect(out.Data).toBe('19/10/2026')
    expect(out.Hores).toBe(1)
  })
  it('Hores is a numeric cell, also when the API sends it as text (issues/274 follow-up)', () => {
    expect(exportRow(dedicatedHoursFields, { hours: '0.45' }).Hores).toBe(0.45)
    expect(exportRow(realDedicationFields, { hours: null }).Hores).toBe('')
    expect(strFromU8(unzipSync(buildOds([['Hores'], [exportRow(dedicatedHoursFields, { hours: 0.45 }).Hores]]))['content.xml']))
      .toContain('office:value-type="float" office:value="0.45"')
  })
})

describe('festive range count (issues/274)', () => {
  it('the days saved are the weekdays', () => {
    // Mon 19/10 to Mon 26/10/2026: 8 days, 6 weekdays
    expect(festiveRangeDates('2026-10-19', '2026-10-26')).toHaveLength(6)
    expect(festiveRangeDates('2026-10-19', null)).toEqual(['2026-10-19'])
  })
  it('the confirmation counts the days that will be saved', () => {
    const confirm = vi.fn()
    const c = {
      festiveTypes: [{ id: 4, name: 'Vacances', personal: true }],
      form: { date: new Date(2026, 9, 19), endDate: new Date(2026, 9, 26), festive_type: 4, users_permissions_user: 15 },
      $buefy: { dialog: { confirm }, snackbar: { open: vi.fn() } },
      $emit: vi.fn()
    }
    ModalBoxFestive.methods.submit.call(c)
    expect(confirm.mock.calls[0][0].message).toMatch(/crear 6 festius/)
  })
})
