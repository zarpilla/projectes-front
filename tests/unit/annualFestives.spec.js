// issues/246: Hores anuals counted a vacation day booked on a holiday (1/1,
// 6/1) by whichever festive came first, so the KPI said «Vacances 24 / 27»
// while the table listed 26; holidays on a Saturday (15/8, 26/12) counted 8 h
// each. The «Festiu» dialog saved on Enter in the date field, and the same day
// could be saved twice.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import VCalendar from 'v-calendar'
import { countedFestiveOn, festiveTaken } from '@/domain/workdayLog.js'

globalThis.ResizeObserver ??= class { observe () {} unobserve () {} disconnect () {} }

const JOEL = { id: 15, username: 'joel' }
const ESTATAL = { name: 'Festiu Estatal', max: 8 }
const VACANCES = { name: 'Vacances', max: 27 }
const festive = (date, type, user = null) => ({ id: date + type.name, date, festive_type: type, users_permissions_user: user })
const FESTIVES = [
  // the vacation first: it used to win
  festive('2026-01-01', VACANCES, JOEL), festive('2026-01-01', ESTATAL),
  festive('2026-01-06', VACANCES, JOEL), festive('2026-01-06', ESTATAL),
  festive('2026-01-07', VACANCES, JOEL),
  festive('2026-08-15', ESTATAL) // a Saturday
]

let festivesData = FESTIVES
const get = vi.fn(async url => {
  if (url.startsWith('years')) return { data: [{ year: 2026, working_hours: 1720 }] }
  if (url.startsWith('festive-types')) return { data: [ESTATAL, VACANCES] }
  if (url.startsWith('festives')) return { data: festivesData }
  if (url.startsWith('daily-dedications')) return { data: [{ from: '2026-01-01', to: '2026-12-31', hours: 8 }] }
  return { data: [] }
})
const post = vi.fn(async (url, data) => ({ data }))
const put = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))
import DedicationSummary from '@/components/DedicationSummary.vue'
import DedicationInput from '@/components/DedicationInput.vue'
import ModalBoxFestive from '@/components/ModalBoxFestive.vue'

beforeEach(() => { post.mockClear(); put.mockClear(); festivesData = FESTIVES })

describe('countedFestiveOn / festiveTaken (issues/246)', () => {
  it('takes the holiday for everyone before a personal day', () => {
    expect(countedFestiveOn('2026-01-01', FESTIVES).festive_type.name).toBe('Festiu Estatal')
    expect(countedFestiveOn('2026-01-07', FESTIVES).festive_type.name).toBe('Vacances')
    expect(countedFestiveOn('2026-01-08', FESTIVES)).toBe(null)
  })
  it('finds a festive of the same person on the date', () => {
    expect(festiveTaken('2026-01-07', 15, FESTIVES)).toBe(true)
    expect(festiveTaken('2026-01-07', 16, FESTIVES)).toBe(false)
    expect(festiveTaken('2026-08-15', null, FESTIVES)).toBe(true)
    // the festive being edited is not a duplicate of itself
    expect(festiveTaken('2026-01-07', 15, FESTIVES, '2026-01-07Vacances')).toBe(false)
  })
})

describe('Hores anuals festives (issues/246)', () => {
  it('KPI and table count the same vacation days; a Saturday holiday counts no hours', async () => {
    const w = mount(DedicationSummary, {
      props: { user: 15, year: 2026 },
      global: { plugins: [Buefy], stubs: { 'b-icon': true } }
    })
    await flushPromises()
    await flushPromises()
    const vacances = w.vm.summary.Vacances
    const table = w.vm.personalMonths.reduce((a, m) => a + m.holidays, 0)
    expect(vacances.days).toBe(1)
    expect(table).toBe(vacances.days)
    expect(w.vm.summary['Festiu Estatal']).toMatchObject({ days: 3, hours: 16 })
  })
})

describe('the «Festiu» dialog (issues/246)', () => {
  it('Enter in the date field does not submit the form', async () => {
    const w = mount(ModalBoxFestive, {
      props: { isActive: false, festiveTypes: [{ id: 3, name: 'Festiu Local', personal: true }], users: [JOEL] },
      global: { plugins: [createPinia(), Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    await flushPromises()
    const input = document.querySelector('.modal-card-body-festive input')
    const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    w.unmount()
    document.body.innerHTML = ''
  })

  it('does not save a day that already has a festive of that person', async () => {
    const w = mount(DedicationInput, {
      props: { date1: new Date(2026, 0, 1), date2: new Date(2026, 0, 31), user: 15, users: [JOEL], projects: [{ id: 1, name: 'Web' }] },
      global: {
        plugins: [createPinia(), Buefy, [VCalendar, { componentPrefix: 'v' }]],
        stubs: { 'download-excel': true, 'kk-progress': true, 'b-modal': true, 'modal-box-dedication': true, 'modal-box-festive': true }
      }
    })
    await flushPromises()
    const snackbar = vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
    w.vm.isModalFestiveActive = true
    await w.vm.modalFestiveSubmit({ id: 0, date: new Date(2026, 0, 7), endDate: null, festive_type: 4, users_permissions_user: 15 })
    expect(post).not.toHaveBeenCalled()
    expect(w.vm.isModalFestiveActive).toBe(true)
    expect(snackbar.mock.calls[0][0].message).toBe("Aquest dia ja hi ha un festiu d'aquesta persona")

    // a range: only the free working days are saved
    await w.vm.modalFestiveSubmit({ id: 0, date: new Date(2026, 0, 7), endDate: new Date(2026, 0, 8), festive_type: 4, users_permissions_user: 15 })
    expect(post.mock.calls.map(c => c[1].date)).toEqual(['2026-01-08'])
    expect(w.vm.isModalFestiveActive).toBe(false)
  })
})
