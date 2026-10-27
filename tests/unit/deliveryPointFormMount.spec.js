// issues/360: the new delivery point form, mounted: Sector before Raó social
// and NIF, the new NIF help, Particular locks 8–19 h, the days of the town
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { NIF_HELP } from '@/domain/deliveryPointForm.js'

const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 3, permissions: [{ permission: 'orders' }] } }
  if (url === 'sectors') return { data: [{ id: 2, name: 'Restauració' }, { id: 5, name: 'Particular' }] }
  if (url.startsWith('cities?')) return { data: [{ id: 1, name: 'Artés' }, { id: 2, name: 'Vic' }] }
  if (url.startsWith('routes?')) {
    return { data: [
      { id: 10, tuesday: true, time_from: '07:00:00.000' },
      { id: 11, thursday: true, time_from: '13:00:00.000', time_to: '15:00:00.000' }
    ] }
  }
  if (url === 'city-routes/basic') {
    return { data: [
      { id: 100, city: { id: 1 }, route: { id: 10 }, time_from: '09:00:00.000', time_to: '11:00:00.000' },
      { id: 101, city: { id: 1 }, route: { id: 11 } }
    ] }
  }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: vi.fn() }) }))
import ContactsUserForm from '@/components/ContactsUserForm.vue'

const mountForm = async () => {
  const wrapper = mount(ContactsUserForm, {
    props: { modal: true },
    global: { plugins: [Buefy, createPinia()], stubs: { 'router-link': true }, mocks: { $route: { params: {}, query: {} } } }
  })
  await flushPromises()
  return wrapper
}

describe('delivery point form (issues/360)', () => {
  it('puts Sector before Raó social and Raó social next to NIF, with the new help', async () => {
    const wrapper = await mountForm()
    const labels = wrapper.findAll('label.label').map(l => l.text())
    const at = name => labels.findIndex(l => l.startsWith(name))
    expect(at('Sector')).toBeLessThan(at('Raó Social'))
    expect(at('NIF')).toBe(at('Raó Social') + 1)
    expect(wrapper.text()).toContain(NIF_HELP)
  })

  it('fixes and locks the hours of a Particular, and unlocks them for another sector', async () => {
    const wrapper = await mountForm()
    const button = name => wrapper.findAll('button').find(b => b.text() === name)
    await button('Particular').trigger('click')
    expect(wrapper.vm.form).toMatchObject({ sector: 5, time_slot_1_ini: 8, time_slot_1_end: 19, time_slot_2_ini: null, time_slot_2_end: null })
    expect(wrapper.vm.slot1Closed).toBe(false)
    expect(wrapper.vm.slot2Closed).toBe(true)
    const selects = () => wrapper.findAll('select')
    expect(selects().every(s => s.element.disabled)).toBe(true)

    await button('Restauració').trigger('click')
    expect(selects()[0].element.disabled).toBe(false)
    expect(wrapper.vm.form.time_slot_1_ini).toBe(8)
  })

  it('shows the days and slots of the chosen town, or that we do not go there', async () => {
    const wrapper = await mountForm()
    wrapper.vm.form.city = 'Artés'
    await flushPromises()
    expect(wrapper.text()).toContain('Quan passem per Artés')
    expect(wrapper.text()).toContain('Dimarts de 9 a 11 h i dijous de 13 a 15 h')

    wrapper.vm.form.city = 'Vic'
    await flushPromises()
    expect(wrapper.text()).toContain('De moment no passem per Vic')
  })
})
