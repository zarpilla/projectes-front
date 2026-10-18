// Registre jornades: the first save of a new slot remounted its row (keyed by
// the id the POST gave it), so the focus and what was typed next were lost; a
// second change during the POST created the slot twice; impossible hours went
// to the backend and its errors were swallowed (issues/180).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async () => ({ data: [] }))
const post = vi.fn()
const put = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))
vi.mock('html3pdf', () => ({ default: () => ({}) }))
import JornadaDiaria from '@/components/JornadaDiaria.vue'

const DATE = '2026-10-15'

const open = async () => {
  const wrapper = mount(JornadaDiaria, {
    props: { user: 5, year: 2026, month: 10, months: [{ month: 10, name: 'octubre' }] },
    attachTo: document.body,
    global: { plugins: [createPinia(), Buefy], stubs: { 'download-excel': true, 'b-loading': true } }
  })
  await flushPromises()
  await flushPromises()
  const toast = vi.spyOn(wrapper.vm.$buefy.toast, 'open').mockImplementation(() => {})
  return { wrapper, toast }
}

const day = wrapper => wrapper.find(`.wl-day[data-date="${DATE}"]`)
const field = (wrapper, label) => day(wrapper).find(`input[aria-label="${label}"]`)
// setValue fires `input` and `change`, as typing and leaving the field
const type = (input, value) => input.setValue(value)

beforeEach(() => {
  get.mockClear()
  post.mockReset()
  put.mockClear()
  vi.useFakeTimers({ now: new Date('2026-10-17T10:00:00+02:00'), toFake: ['Date'] })
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('saving a new workday slot (issues/180)', () => {
  it('keeps the row, its focus and the exit typed while the first POST is on its way', async () => {
    let answer
    post.mockImplementation((url, data) => new Promise(resolve => { answer = () => resolve({ data: { ...data, id: 77 } }) }))
    const { wrapper } = await open()
    await day(wrapper).find('.wl-add').trigger('click')

    await type(field(wrapper, "Hora d'entrada"), '9')
    await type(field(wrapper, "Minut d'entrada"), '00')
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][1].hour_in).toBe('09:00:00.000')

    const exitHour = field(wrapper, 'Hora de sortida')
    exitHour.element.focus()
    answer()
    await flushPromises()
    // same element, still focused: the row was not remounted
    expect(field(wrapper, 'Hora de sortida').element).toBe(exitHour.element)
    expect(document.activeElement).toBe(exitHour.element)

    await type(field(wrapper, 'Hora de sortida'), '13')
    await type(field(wrapper, 'Minut de sortida'), '30')
    await flushPromises()
    expect(post).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledTimes(1)
    expect(put.mock.calls[0][0]).toBe('workday-logs/77')
    expect(put.mock.calls[0][1]).toMatchObject({ hour_in: '09:00:00.000', hour_out: '13:30:00.000' })
    expect(field(wrapper, "Hora d'entrada").element.value).toBe('09')
    wrapper.unmount()
  })

  it('creates the slot once when the exit is saved before the POST answers', async () => {
    let answer
    post.mockImplementation((url, data) => new Promise(resolve => { answer = () => resolve({ data: { ...data, id: 78 } }) }))
    const { wrapper } = await open()
    await day(wrapper).find('.wl-add').trigger('click')
    await type(field(wrapper, "Hora d'entrada"), '09')
    await type(field(wrapper, "Minut d'entrada"), '00')
    await type(field(wrapper, 'Hora de sortida'), '13')
    await type(field(wrapper, 'Minut de sortida'), '30')
    answer()
    await flushPromises()
    expect(post).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledTimes(1)
    expect(put.mock.calls[0][1]).toMatchObject({ id: 78, hour_out: '13:30:00.000' })
    wrapper.unmount()
  })

  it('refuses an impossible hour with a notice and goes back to the saved one', async () => {
    post.mockImplementation(async (url, data) => ({ data: { ...data, id: 79 } }))
    const { wrapper, toast } = await open()
    await day(wrapper).find('.wl-add').trigger('click')
    await type(field(wrapper, "Hora d'entrada"), '09')
    await type(field(wrapper, "Minut d'entrada"), '00')
    await flushPromises()

    await type(field(wrapper, 'Hora de sortida'), '25')
    await type(field(wrapper, 'Minut de sortida'), '00')
    await flushPromises()
    expect(put).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
    expect(field(wrapper, 'Hora de sortida').element.value).toBe('')
    wrapper.unmount()
  })

  it('shows the backend error when a save fails', async () => {
    post.mockRejectedValue({ response: { data: { error: { message: 'Invalid time format' } } } })
    const { wrapper, toast } = await open()
    await day(wrapper).find('.wl-add').trigger('click')
    await type(field(wrapper, "Hora d'entrada"), '09')
    await type(field(wrapper, "Minut d'entrada"), '00')
    await flushPromises()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      message: "No s'ha pogut desar el tram: Invalid time format",
      type: 'is-danger'
    }))
    wrapper.unmount()
  })
})
