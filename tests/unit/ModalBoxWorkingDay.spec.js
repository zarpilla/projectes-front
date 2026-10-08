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
