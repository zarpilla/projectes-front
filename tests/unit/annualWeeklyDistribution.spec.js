// issues/238 (reopened, review 8): Hores anuals still left out the weekend hours
// of a weekly distribution and counted the weekdays with 0 h as days with
// jornada. Ariadna 2025 with 8,8,8,0,0,6,0: Saldo d'hores 1.432 h, Hores anuals
// «Dies feiners amb jornada 230 dies 1.120 h», «Jornada 4,87 h/dia». The share
// of a full jornada (what scales the conveni) must still count every weekday:
// 0,9,10,9,0,0,0 is 70 %, not 117 % (f61a83a).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

let distribution = null
let periods = null
const get = vi.fn(async url => {
  if (url.startsWith('years')) return { data: [{ year: 2025, working_hours: 1720 }] }
  if (url.startsWith('festive-types')) return { data: [{ name: 'Vacances', max: 0 }] }
  if (url.startsWith('daily-dedications')) return { data: periods || [{ from: '2025-01-01', to: '2025-12-31', hours: 8, hoursperday: distribution }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationSummary from '@/components/DedicationSummary.vue'

const load = async hoursperday => {
  distribution = hoursperday
  const w = mount(DedicationSummary, {
    props: { user: 15, year: 2025 },
    global: { plugins: [Buefy], stubs: { 'b-icon': true, 'router-link': true } }
  })
  await flushPromises()
  await flushPromises()
  return w.vm
}

// 2025: 52 Mondays, Tuesdays, Thursdays, Saturdays; 53 Wednesdays; 261 weekdays
describe('Hores anuals with a weekly distribution (issues/238)', () => {
  it('counts the Saturday hours and only the days with hours', async () => {
    const vm = await load('8,8,8,0,0,6,0')
    expect(vm.calc.baseDays).toBe(52 + 52 + 53 + 52)
    expect(vm.calc.baseHours).toBe((52 + 52 + 53) * 8 + 52 * 6)
    expect(vm.calc.dayHours).toBeCloseTo(1568 / 209, 6)
    // 30 h a week of 40
    expect(vm.calc.ratio).toBeCloseTo(1568 / 261 / 8, 6)
  })

  it('a jornada with 0-h weekdays is a share under 100 %', async () => {
    const vm = await load('0,9,10,9,0,0,0')
    expect(vm.calc.baseDays).toBe(52 + 53 + 52)
    expect(vm.calc.dayHours).toBeCloseTo(1466 / 157, 6)
    expect(vm.calc.ratio).toBeCloseTo(1466 / 261 / 8, 6)
    expect(Number(vm.summary['Màxim Conveni'].hours)).toBeCloseTo(1720 * 1466 / 261 / 8, 1)
  })

  it('without a distribution it stays as before', async () => {
    const vm = await load(null)
    expect(vm.calc.baseDays).toBe(261)
    expect(vm.calc.dayHours).toBe(8)
    expect(vm.calc.ratio).toBe(1)
    expect(vm.summary['Màxim Conveni'].days).toBe(215)
  })
})

// issues/225: person 32 in 2025, 01/01–31/08 at 0 h and 01/09–31/12 at 8 h,
// showed «Dies feiners amb jornada 247 dies 648 h», «Jornada 2,62 h/dia». The
// days of a 0-h period are not days with jornada (covered by 238's fix).
describe('Hores anuals with a 0-h period (issues/225)', () => {
  it('counts only the days of the 8-h period', async () => {
    periods = [
      { from: '2025-01-01', to: '2025-08-31', hours: 0, hoursperday: null },
      { from: '2025-09-01', to: '2025-12-31', hours: 8, hoursperday: null }
    ]
    const vm = await load(null)
    periods = null
    // weekdays from 01/09 to 31/12/2025: 22 + 23 + 20 + 23
    expect(vm.calc.baseDays).toBe(88)
    expect(vm.calc.baseHours).toBe(88 * 8)
    expect(vm.calc.dayHours).toBe(8)
  })
})
