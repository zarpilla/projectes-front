// The Dedicació calendar and day list (issues/003): the day list calls
// formatTitle, which the Vue 3 filters codemod had left outside `methods`.
// The render error it threw also left the month datepicker out of sync.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import VCalendar from 'v-calendar'
import moment from 'moment'
import 'moment/dist/locale/ca'

// v-calendar watches its size; jsdom has no ResizeObserver
globalThis.ResizeObserver ??= class { observe () {} unobserve () {} disconnect () {} }

const activities = [
  { id: 1, date: '2026-10-07', hours: 2, project: { id: 1, name: 'Web' }, users_permissions_user: { id: 5, username: 'anna' } },
  { id: 2, date: '2026-10-07', hours: 1.5, project: { id: 2, name: 'App' }, users_permissions_user: { id: 5, username: 'anna' } },
  { id: 3, date: '2026-10-05', hours: 3, project: { id: 1, name: 'Web' }, users_permissions_user: { id: 5, username: 'anna' } }
]
const get = vi.fn(async url => ({ data: url.startsWith('activities/calendar') ? activities : [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationInput from '@/components/DedicationInput.vue'

const october = { date1: new Date(2026, 9, 1), date2: new Date(2026, 9, 31) }

async function mountInput (props = {}, options = {}) {
  const w = mount(DedicationInput, {
    props: { ...october, user: 5, users: [], projects: [{ id: 1, name: 'Web' }, { id: 2, name: 'App' }], ...props },
    global: {
      plugins: [createPinia(), Buefy, [VCalendar, { componentPrefix: 'v' }]],
      // the real <transition>: v-calendar's move() waits for it to end
      stubs: { 'download-excel': true, 'kk-progress': true, 'b-modal': true, 'modal-box-dedication': true, transition: false }
    },
    ...options
  })
  await flushPromises()
  return w
}

afterEach(() => { get.mockClear(); vi.useRealTimers() })

describe('DedicationInput', () => {
  it('titles each day of the list with its date', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-08T10:00:00+02:00'), toFake: ['Date'] })
    const errors = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = await mountInput()
    await w.find('button[title="Vista taula"]').trigger('click')
    const titles = w.findAll('.table-view span.is-total').map(s => s.text())
    expect(titles).toEqual(['Dimecres 07/10/2026 (fa un dia)', 'Dilluns 05/10/2026 (fa 3 dies)'])
    expect(errors.mock.calls.map(c => String(c[0])).filter(m => m.includes('formatTitle'))).toEqual([])
    errors.mockRestore()
  })

  it('asks the parent for the new month when the month arrows are clicked', async () => {
    const w = await mountInput()
    // v-calendar reports its first page once mounted; the parent ignores it (same dates)
    expect(w.emitted('calendar-changed')).toEqual([[{ year: 2026, month: 10 }]])
    await w.find('.vc-arrow.vc-prev').trigger('click')
    await flushPromises()
    await w.find('.vc-arrow.vc-next').trigger('click')
    await w.find('.vc-arrow.vc-next').trigger('click')
    await flushPromises()
    expect(w.emitted('calendar-changed').slice(1)).toEqual([
      [{ year: 2026, month: 9 }], [{ year: 2026, month: 10 }], [{ year: 2026, month: 11 }]
    ])
  })

  it('moves the calendar and reloads when the parent changes the dates', async () => {
    const w = await mountInput()
    get.mockClear()
    await w.setProps({ date1: new Date(2026, 8, 1), date2: new Date(2026, 8, 30) })
    await vi.waitFor(() => expect(w.find('.vc-title').text()).toBe('setembre 2026'))
    await flushPromises()
    expect(get.mock.calls.map(c => c[0]).filter(u => u.startsWith('activities/calendar')))
      .toEqual(['activities/calendar?_where[date_gte]=2026-09-01&[date_lte]=2026-09-30&[users_permissions_user.id]=5&_limit=-1'])
  })

  // issues/070: «Tot» (a card per activity per day) was the default view, and
  // without a person every person's hours were loaded
  it('opens on the calendar and loads nobody\'s hours without a person', async () => {
    const w = await mountInput({ user: null })
    expect(w.vm.viewType).toBe('calendar')
    expect(get.mock.calls.map(c => c[0]).filter(u => u.startsWith('activities/calendar'))).toEqual([])
    expect(w.text()).toContain('Tria una persona')
  })

  it('«Totes» (0) loads everybody', async () => {
    await mountInput({ user: 0 })
    const urls = get.mock.calls.map(c => c[0]).filter(u => u.startsWith('activities/calendar'))
    expect(urls).toHaveLength(1)
    expect(urls[0]).not.toContain('users_permissions_user')
  })

  // issues/062: hours without a project were dropped from the calendar, the
  // day and week sums and the total (Laia Puig, Oct 2025: 7 h shown, 9 h logged)
  it('counts hours without a project, under «Sense projecte»', async () => {
    get.mockImplementation(async url => ({
      data: url.startsWith('activities/calendar')
        ? [...activities, { id: 4, date: '2026-10-07', hours: 2, project: null, users_permissions_user: { id: 5, username: 'anna' } }]
        : []
    }))
    const w = await mountInput()
    expect(w.vm.hoursTotal).toBe(8.5)
    expect(w.vm.distinctTotals.find(d => d.day === '2026-10-07').hours).toBe(5.5)
    expect(w.vm.distinctProjectsObj.map(p => p.name)).toContain('Sense projecte')
    get.mockImplementation(async url => ({ data: url.startsWith('activities/calendar') ? activities : [] }))
  })

  // on a phone the grid leaves ~50 px per day: the entries are listed under it, whole
  describe('on a phone', () => {
    const phone = matches => { window.matchMedia = vi.fn(() => ({ matches })) }
    afterEach(() => { delete window.matchMedia })

    it('lists the month by week and day, with the whole project names', async () => {
      const w = await mountInput()
      const days = w.findAll('.agenda-day')
      expect(days.map(d => d.find('.agenda-day-name').text())).toEqual(["dilluns 5 d'octubre", "dimecres 7 d'octubre"])
      expect(days.map(d => d.find('.agenda-day-hours').text())).toEqual(['3,00 h', '3,50 h'])
      expect(w.findAll('.agenda-week-title b').map(b => b.text())).toEqual(['6,50 h'])
      expect(days[1].findAll('.agenda-project').map(p => p.text())).toEqual(['Web', 'App'])
      await days[1].findAll('.agenda-entry')[1].trigger('click')
      expect(w.vm.isModalEditActive).toBe(true)
      expect(w.vm.dedicationObject.id).toBe(2)
    })

    it('a day with hours scrolls to them; an empty day adds hours', async () => {
      phone(true)
      const w = await mountInput({}, { attachTo: document.body })
      const scroll = vi.fn()
      document.getElementById('agenda-2026-10-07').scrollIntoView = scroll
      w.vm.dayTapped({ date: new Date(2026, 9, 7) })
      expect(scroll).toHaveBeenCalled()
      expect(w.vm.isModalEditActive).toBe(false)
      w.vm.dayClicked({ date: new Date(2026, 9, 7) })
      expect(w.vm.isModalEditActive).toBe(false)
      w.vm.dayTapped({ date: new Date(2026, 9, 9) })
      expect(w.vm.isModalEditActive).toBe(true)
      expect(w.vm.dedicationObject).toEqual({ date: '2026-10-09', counter: null })
      w.unmount()
    })

    it('does nothing different on a desktop', async () => {
      phone(false)
      const w = await mountInput()
      w.vm.dayTapped({ date: new Date(2026, 9, 9) })
      expect(w.vm.isModalEditActive).toBe(false)
      w.vm.dayClicked({ date: new Date(2026, 9, 9) })
      expect(w.vm.isModalEditActive).toBe(true)
    })
  })
})
