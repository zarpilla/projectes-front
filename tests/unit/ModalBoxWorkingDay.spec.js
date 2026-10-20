// The Jornada modal on the working-day page (issues/008): the parent's save
// handler turns the submitted dates into strings and drops `_dedication`. When
// that payload was the modal's own form, the datepickers re-rendered with
// strings, the render failed and the modal stayed open after saving.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import moment from 'moment'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn() }) }))
import ModalBoxWorkingDay from '@/components/ModalBoxWorkingDay.vue'

const dedication = {
  id: 7, from: '2026-11-01', to: '2026-12-31', hours: 8, hoursperday: '',
  monthly_salary: 1800, scheme: 'general', quota: 0, pct_quota: 30, pct_irpf: 2, pct_other: 0,
  users_permissions_user: { id: 5, username: 'anna' }
}

async function openModal () {
  const w = mount(ModalBoxWorkingDay, {
    props: { isActive: false, dedicationObject: { _dedication: dedication }, users: [], years: [] },
    global: { plugins: [createPinia(), Buefy] },
    attachTo: document.body
  })
  await w.setProps({ isActive: true })
  await new Promise(r => setTimeout(r, 150)) // show() clears `dirty` after 100 ms
  return w
}

// What DedicationWorkingDay.updateActivity does with the payload before closing
async function saveLikeTheParent (w, activity) {
  delete activity._dedication
  activity.from = moment(activity.from).format('YYYY-MM-DD')
  activity.to = moment(activity.to).format('YYYY-MM-DD')
  await w.setProps({ isActive: false })
  await flushPromises()
}

describe('ModalBoxWorkingDay', () => {
  it('closes after a change is accepted', async () => {
    const w = await openModal()
    w.vm.form.hours = 6
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    const [[activity]] = w.emitted('submit')
    expect(activity).toMatchObject({ id: 7, hours: 6 })
    await saveLikeTheParent(w, activity)
    expect(w.vm.isModalActive).toBe(false)
    expect(document.querySelector('.modal').style.display).toBe('none')
    w.unmount()
  })

  it('closes on accept without changes, as before', async () => {
    const w = await openModal()
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    expect(w.emitted('cancel')).toHaveLength(1)
    expect(w.vm.isModalActive).toBe(false)
    w.unmount()
  })
})

// issues/225: a period ending before it starts, or with negative hours, was
// saved (the API answered 201) and counted in every hours screen
describe('ModalBoxWorkingDay validation (issues/225)', () => {
  it('refuses a period that ends before it starts', async () => {
    const w = await openModal()
    w.vm.form.from = new Date(2027, 11, 1)
    w.vm.form.to = new Date(2027, 5, 1)
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    w.unmount()
  })

  it('refuses negative hours', async () => {
    const w = await openModal()
    w.vm.fixDecimals('hours', '-3')
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    w.unmount()
  })

  it('accepts a one-day period with 0 h', async () => {
    const w = await openModal()
    w.vm.form.from = new Date(2027, 0, 4)
    w.vm.form.to = new Date(2027, 0, 4)
    w.vm.fixDecimals('hours', '0')
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toHaveLength(1)
    w.unmount()
  })
})

// issues/300: «4,4,4,4,5.1,0,0» with Hores 4,22 was refused (21.1 !== 4.22 × 5 =
// 21.099999…), and a new period was saved with scheme NULL unless a radio was clicked
describe('ModalBoxWorkingDay hours per day and scheme (issues/300)', () => {
  async function openWith (_dedication, quotes) {
    const w = mount(ModalBoxWorkingDay, {
      props: { isActive: false, dedicationObject: { _dedication }, users: [], years: [], quotes },
      global: { plugins: [createPinia(), Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    await new Promise(r => setTimeout(r, 150))
    return w
  }

  it('accepts a weekly distribution equal to the hours to the hundredth', async () => {
    const w = await openModal()
    w.vm.fixDecimals('hours', '4,22')
    w.vm.form.hoursperday = '4,4,4,4,5.1,0,0'
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toHaveLength(1)
    w.unmount()
  })

  it('still refuses a distribution that does not add up', async () => {
    const w = await openModal()
    w.vm.fixDecimals('hours', '4,22')
    w.vm.form.hoursperday = '4,4,4,4,5,0,0'
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    w.unmount()
  })

  it('gives a new period the default scheme and its quotas', async () => {
    const quotes = { id: 1, autonoma_quota: 300, autonoma_pct_quota: 0, autonoma_pct_irpf: 15, autonoma_pct_other: 0 }
    const w = await openWith({ from: '2027-01-01', to: '2027-06-30', users_permissions_user: { id: 5, username: 'anna' } }, quotes)
    w.vm.fixDecimals('hours', '6')
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    const [[period]] = w.emitted('submit')
    expect(period).toMatchObject({ scheme: 'autonoma', quota: 300, pct_irpf: 15 })
    w.unmount()
  })

  it('keeps the scheme of an existing period', async () => {
    const w = await openModal()
    expect(w.vm.form.scheme).toBe('general')
    expect(w.vm.form.quota).toBe(0)
    w.unmount()
  })
})
