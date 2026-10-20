// issues/291 (review 9): after 238's reopened fix Hores anuals charged each
// pending vacation / free day a whole «Jornada h/dia» while «Màxim del
// conveni» was scaled by the share of a full jornada (8 h × every weekday).
// A person at 5 h in January–February and 0 h the rest of 2026 (Ana Correro)
// got «Saldo anual −135,30 h (−27 dies)»; master's formula gives −0,80 h.
// A pending day is a weekday: it takes off an average weekday's hours
// (hours / weekdays = share × 8, master's rule), and the days are days with
// jornada (hours / jornada h/dia), so hours and days tell the same.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

let periods = null
const get = vi.fn(async url => {
  if (url.startsWith('years')) return { data: [{ year: 2026, working_hours: 1760 }] }
  if (url.startsWith('festive-types')) return { data: [{ name: 'Vacances', max: 22 }] }
  if (url.startsWith('daily-dedications')) return { data: periods }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationSummary from '@/components/DedicationSummary.vue'

const load = async ps => {
  periods = ps
  const w = mount(DedicationSummary, {
    props: { user: 15, year: 2026 },
    global: { plugins: [Buefy], stubs: { 'b-icon': true, 'router-link': true } }
  })
  await flushPromises()
  await flushPromises()
  return w.vm
}
const saldo = vm => vm.summary["Saldo anual d'hores (Laborables - Conveni)"]

// 2026: 261 weekdays; January 22, February 20
describe('Hores anuals with 0-h months (issues/291)', () => {
  it('5 h in January–February, 0 h the rest: master\'s balance', async () => {
    const vm = await load([
      { from: '2026-01-01', to: '2026-02-28', hours: 5, hoursperday: null },
      { from: '2026-03-01', to: '2026-12-31', hours: 0, hoursperday: null }
    ])
    expect(vm.calc.baseDays).toBe(42)
    expect(vm.calc.baseHours).toBe(210)
    expect(vm.calc.dayHours).toBe(5)
    expect(vm.calc.ratio).toBeCloseTo(210 / 261 / 8, 9)
    // 22 pending weekdays at 210 / 261 h each, 22 × 42 / 261 days of 5 h
    expect(vm.calc.pending[0].hours).toBeCloseTo(22 * 210 / 261, 9)
    expect(vm.calc.pending[0].days).toBeCloseTo(22 * 42 / 261, 9)
    expect(Number(vm.summary['Màxim Conveni'].hours)).toBeCloseTo(1760 * 210 / 261 / 8, 2)
    // master: 210 − 22 × ratio × 8 − 1760 × ratio
    const master = 210 - 22 * 210 / 261 - 1760 * 210 / 261 / 8
    expect(Number(saldo(vm).hours)).toBeCloseTo(master, 2)
    expect(saldo(vm).days).toBeCloseTo(master / 5, 6)
  })

  it('a flat 8 h jornada all year stays as on master', async () => {
    const vm = await load([{ from: '2026-01-01', to: '2026-12-31', hours: 8, hoursperday: null }])
    expect(vm.calc.pending[0].days).toBe(22)
    expect(vm.calc.pending[0].hours).toBe(176)
    expect(vm.summary.Laborables.days).toBe(239)
    expect(Number(saldo(vm).hours)).toBe((261 - 22) * 8 - 1760)
    expect(saldo(vm).days).toBe(261 - 22 - 1760 / 8)
  })

  it('keeps the Saturday hours of a distribution (238) on the same scale', async () => {
    const vm = await load([{ from: '2026-01-01', to: '2026-12-31', hours: 6, hoursperday: '8,8,8,0,0,6,0' }])
    // 2026: 52 Mondays, Tuesdays, Wednesdays, Saturdays
    const H = 52 * 8 * 3 + 52 * 6
    expect(vm.calc.baseHours).toBe(H)
    expect(vm.calc.pending[0].hours).toBeCloseTo(22 * H / 261, 9)
    expect(Number(saldo(vm).hours)).toBeCloseTo(H - 22 * H / 261 - 1760 * H / 261 / 8, 2)
    expect(saldo(vm).days).toBeCloseTo(Number(saldo(vm).hours) / vm.calc.dayHours, 2)
  })
})
