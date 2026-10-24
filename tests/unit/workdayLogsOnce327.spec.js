// issues/327: Registre de jornades sets the person, the year and the month at
// once, and each one's watcher reloaded the whole log: the same workday-logs,
// users and daily-dedications went out two or three times.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn(), put: vi.fn() }) }))
vi.mock('html3pdf', () => ({ default: () => ({}) }))
import JornadaDiaria from '@/components/JornadaDiaria.vue'

const asked = prefix => get.mock.calls.filter(c => c[0].startsWith(prefix)).length

beforeEach(() => get.mockClear())

describe('Registre de jornades loads once per filter change (issues/327)', () => {
  it('asks the log once when the person, year and month arrive together', async () => {
    const wrapper = mount(JornadaDiaria, {
      props: { user: null, year: null, month: null, months: [{ month: 9, name: 'setembre' }, { month: 10, name: 'octubre' }] },
      global: { plugins: [createPinia(), Buefy], stubs: { 'download-excel': true, 'b-loading': true } }
    })
    await flushPromises()
    await wrapper.setProps({ user: 5, year: 2026, month: 10 })
    await flushPromises()
    expect(asked('workday-logs')).toBe(1)
    expect(asked('daily-dedications')).toBe(1)

    await wrapper.setProps({ month: 9 })
    await flushPromises()
    expect(asked('workday-logs')).toBe(2)
    wrapper.unmount()
  })
})
