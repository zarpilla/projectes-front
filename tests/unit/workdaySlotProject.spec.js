// issues/244: an inverted Registre jornades slot (09:00–08:30) only showed a
// warning (issues/128) while its project activity was saved with −0,5 h; a
// project chosen on an open slot («en curs») created an activity with null hours.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { slotActivityHours } from '@/domain/workdayLog.js'

const get = vi.fn(async () => ({ data: [] }))
const post = vi.fn(async (url, data) => ({ data: { ...data, id: 900 } }))
const put = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))
vi.mock('html3pdf', () => ({ default: () => ({}) }))
import JornadaDiaria from '@/components/JornadaDiaria.vue'

const open = async () => {
  const wrapper = mount(JornadaDiaria, {
    props: { user: 5, year: 2026, month: 10, months: [{ month: 10, name: 'octubre' }] },
    global: { plugins: [createPinia(), Buefy], stubs: { 'download-excel': true, 'b-loading': true } }
  })
  await flushPromises()
  const toast = vi.spyOn(wrapper.vm.$buefy.toast, 'open').mockImplementation(() => {})
  return { wrapper, toast }
}

const slot = (fields) => ({
  id: 12, date: '2026-10-15', users_permissions_user: 5, project: 3,
  hour_in: '09:00:00.000', hour_in_h: '09', hour_in_m: '00', ...fields
})

beforeEach(() => { post.mockClear(); put.mockClear() })

describe('slotActivityHours (issues/244)', () => {
  it('gives the hours, 0 while open, null when inverted', () => {
    expect(slotActivityHours('09:00:00', '11:30:00')).toBe(2.5)
    expect(slotActivityHours('09:00:00', null)).toBe(0)
    expect(slotActivityHours('09:00:00', '08:30:00')).toBe(null)
  })
})

describe('the project activity of a workday slot (issues/244)', () => {
  it('keeps the last valid hours when the slot is inverted', async () => {
    const { wrapper, toast } = await open()
    const a = slot({ hour_out: '08:30:00.000', hour_out_h: '08', hour_out_m: '30', activity: { id: 34721 } })
    await wrapper.vm.projectChanged(a, 0)
    expect(put).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
    expect(wrapper.vm.updating).toBe(false)
  })

  it('saves the hours of a valid slot', async () => {
    const { wrapper } = await open()
    const a = slot({ hour_out: '11:30:00.000', hour_out_h: '11', hour_out_m: '30', activity: { id: 34721 } })
    await wrapper.vm.projectChanged(a, 0)
    expect(put).toHaveBeenCalledWith('activities/34721', expect.objectContaining({ hours: 2.5, project: 3 }))
  })

  it('creates the activity of an open slot with 0 h, not null', async () => {
    const { wrapper } = await open()
    const a = slot({ hour_out: null, activity: null })
    await wrapper.vm.projectChanged(a, 0)
    const created = post.mock.calls.find(c => c[0] === 'activities')
    expect(created[1]).toMatchObject({ hours: 0, project: 3 })
  })
})
