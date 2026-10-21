// «Distribució setmanal» as seven day fields instead of a free text. What is
// saved must stay the text read by the back and the hours screens: seven
// numbers, Monday first, comma separated, decimal dot, or "" when uniform.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import WeeklyHoursInput, { splitDays, joinDays, defaultDays } from '@/components/WeeklyHoursInput.vue'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn() }) }))
import ModalBoxWorkingDay from '@/components/ModalBoxWorkingDay.vue'

describe('weekly distribution text', () => {
  it.each([
    '8,8,0,8,8,0,0',
    '4,4,4,4,5.1,0,0',
    '7.5,7.5,7.5,7.5,7.5,0,0',
    '0,0,0,0,0,4,4'
  ])('reads and writes %s unchanged', value => {
    expect(joinDays(splitDays(value))).toBe(value)
  })

  it('shows a decimal comma and saves a dot', () => {
    expect(splitDays('4,4,4,4,5.1,0,0')[4]).toBe('5,1')
    expect(joinDays(['4', '4', '4', '4', '5,1', '0', '0'])).toBe('4,4,4,4,5.1,0,0')
  })

  it('saves an empty day as 0 and ignores spaces', () => {
    expect(joinDays(['8', ' 8 ', '', '8', '8', '', ''])).toBe('8,8,0,8,8,0,0')
  })

  it('starts a week with the daily hours Monday to Friday', () => {
    expect(joinDays(defaultDays(6))).toBe('6,6,6,6,6,0,0')
    expect(joinDays(defaultDays('4.22'))).toBe('4.22,4.22,4.22,4.22,4.22,0,0')
    expect(joinDays(defaultDays(null))).toBe('0,0,0,0,0,0,0')
  })
})

function mountInput (props) {
  return mount(WeeklyHoursInput, { props, global: { plugins: [Buefy] } })
}

describe('WeeklyHoursInput', () => {
  it('has no day fields while the hours are uniform', () => {
    const w = mountInput({ modelValue: '', hours: 8 })
    expect(w.findAll('.weekly-hours-day input')).toHaveLength(0)
  })

  it('shows the seven days of a saved distribution', () => {
    const w = mountInput({ modelValue: '8,8,0,8,8,0,0', hours: 6.4 })
    const values = w.findAll('.weekly-hours-day input').map(i => i.element.value)
    expect(values).toEqual(['8', '8', '0', '8', '8', '0', '0'])
    expect(w.find('.weekly-hours-total').text()).toContain('Total setmana: 32 h')
    expect(w.find('.weekly-hours-total').classes()).not.toContain('has-text-danger')
  })

  it('emits the stored text when a day changes', async () => {
    const w = mountInput({ modelValue: '8,8,0,8,8,0,0', hours: 6.4 })
    await w.findAll('.weekly-hours-day input')[2].setValue('4,5')
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['8,8,4.5,8,8,0,0'])
  })

  it('warns when the week does not add up to the hours × 5', () => {
    const w = mountInput({ modelValue: '8,8,8,8,8,0,0', hours: 6 })
    const total = w.find('.weekly-hours-total')
    expect(total.classes()).toContain('has-text-danger')
    expect(total.text()).toContain('ha de sumar 30 h')
  })

  it('turning it on fills Monday to Friday, turning it off clears it', async () => {
    const w = mountInput({ modelValue: '', hours: 6 })
    await w.find('input[type=checkbox]').setValue(true)
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['6,6,6,6,6,0,0'])
    await w.setProps({ modelValue: '6,6,6,6,6,0,0' })
    await w.find('input[type=checkbox]').setValue(false)
    expect(w.emitted('update:modelValue').at(-1)).toEqual([''])
  })

  it('follows another period opened in the same modal', async () => {
    const w = mountInput({ modelValue: '8,8,0,8,8,0,0', hours: 6.4 })
    await w.setProps({ modelValue: '4,4,4,4,4,0,0' })
    expect(w.findAll('.weekly-hours-day input').map(i => i.element.value)).toEqual(['4', '4', '4', '4', '4', '0', '0'])
    await w.setProps({ modelValue: '' })
    expect(w.findAll('.weekly-hours-day input').map(i => i.element.value)).toEqual(['', '', '', '', '', '', ''])
  })
})

// The modal saves the same hoursperday as with the old text field
describe('ModalBoxWorkingDay with the day fields', () => {
  async function openWith (hours, hoursperday) {
    const _dedication = {
      id: 7, from: '2026-11-01', to: '2026-12-31', hours, hoursperday,
      monthly_salary: 1800, scheme: 'general', quota: 0, pct_quota: 30, pct_irpf: 2, pct_other: 0,
      users_permissions_user: { id: 5, username: 'anna' }
    }
    const w = mount(ModalBoxWorkingDay, {
      props: { isActive: false, dedicationObject: { _dedication }, users: [], years: [] },
      global: { plugins: [createPinia(), Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    await new Promise(r => setTimeout(r, 150)) // show() clears `dirty` after 100 ms
    return w
  }

  it('saves an edited day in the stored format', async () => {
    const w = await openWith(6.4, '8,8,0,8,8,0,0')
    const days = w.findAll('.weekly-hours-day input')
    await days[0].setValue('4')
    await days[2].setValue('4')
    await w.find('form').trigger('submit')
    const [[period]] = w.emitted('submit')
    expect(period.hoursperday).toBe('4,8,4,8,8,0,0')
    w.unmount()
  })

  it('keeps an untouched distribution exactly as it was', async () => {
    const w = await openWith(4.22, '4,4,4,4,5.1,0,0')
    w.vm.fixDecimals('monthly_salary', '1900')
    await w.vm.$nextTick()
    await w.find('form').trigger('submit')
    const [[period]] = w.emitted('submit')
    expect(period.hoursperday).toBe('4,4,4,4,5.1,0,0')
    w.unmount()
  })

  it('saves "" when the distribution is turned off', async () => {
    const w = await openWith(6.4, '8,8,0,8,8,0,0')
    await w.find('.weekly-hours-input input[type=checkbox]').setValue(false)
    await w.find('form').trigger('submit')
    const [[period]] = w.emitted('submit')
    expect(period.hoursperday).toBe('')
    w.unmount()
  })

  it('still refuses a week that does not add up', async () => {
    const w = await openWith(6.4, '8,8,0,8,8,0,0')
    await w.findAll('.weekly-hours-day input')[2].setValue('8')
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    w.unmount()
  })
})
