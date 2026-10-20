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
import { festiveRangeDates } from '@/domain/workdayLog.js'

// what vue-json-excel writes for one row with `fields`
const exportRow = (fields, row) =>
  Object.fromEntries(Object.entries(fields).map(([label, f]) => {
    if (typeof f === 'string') return [label, row[f]]
    return [label, f.callback(row[f.field], row)]
  }))

describe('Registre jornades PDF (issues/274)', () => {
  it('lists the days as dd/mm/yyyy', () => {
    expect(JornadaDiaria.methods.pdfDate('2026-10-19')).toBe('19/10/2026')
  })
  it('does not capitalize the month total', () => {
    expect(jornadaSource).toMatch(/\.invoice-box tr\.is-total \{\s*text-transform: none;/)
  })
})

describe('hours exports (issues/274)', () => {
  it('% Dedicació real: Catalan headers and dd/mm/yyyy', () => {
    const row = { project_name: 'P', username: 'anna', hours: 2.5, date: '2026-10-19', month: '10', year: 2026 }
    expect(exportRow(realDedicationFields, row)).toEqual({
      Projecte: 'P', Persona: 'anna', Hores: '2,5', Data: '19/10/2026', Mes: '10', Any: 2026
    })
  })
  it('Hores dedicades: Catalan headers and dd/mm/yyyy', () => {
    const row = { date: '2026-10-19', project: 'P', username: 'anna', hours: 1, description: 'd', activity: 'a', type: 't', client: 'c' }
    const out = exportRow(dedicatedHoursFields, row)
    expect(Object.keys(out)).toEqual(['Data', 'Projecte', 'Persona', 'Hores', 'Descripció', 'Funció', 'Tipus de dedicació', 'Client'])
    expect(out.Data).toBe('19/10/2026')
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
