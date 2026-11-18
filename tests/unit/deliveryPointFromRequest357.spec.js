// issues/357, seguiment (la Diligència): from an approved «Consulta i autorització nou
// punt d'entrega», the office opens the delivery point form filled with what
// the request says (/punt-entrega/0?consulta=7); saving the new point links it
// to the request, which then shows the point instead of the button.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

let mePermissions = ['orders_admin']
const REQUEST = {
  id: 7, trade_name: 'Bar Nou', city: 'Vic', address: 'C/ Major 1', schedule: 'de 8 a 14 i de 16 a 19 h',
  estimated_weight: '15 kg', notes: 'Porta lateral', answered: true, status: 'approved',
  user: { id: 5, username: 'formatges', fullname: 'Formatges Serra' }
}
const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 3, permissions: mePermissions.map(permission => ({ permission })) } }
  if (url === 'users') return { data: [{ id: 5, username: 'formatges', permissions: [{ permission: 'orders' }] }] }
  if (url.startsWith('cities?')) return { data: [{ id: 1, name: 'Artés' }, { id: 2, name: 'Vic' }] }
  if (url === 'cities/postcodes') return { data: { vic: '08500' } }
  if (url === 'delivery-point-requests/7') return { data: REQUEST }
  return { data: [] }
})
const put = vi.fn(async () => ({ data: {} }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn(), delete: vi.fn() }) }))
import ContactsUserForm from '@/components/ContactsUserForm.vue'

const mountForm = async (query = { consulta: '7' }) => {
  const wrapper = mount(ContactsUserForm, {
    props: { id: 0 },
    global: {
      plugins: [Buefy, createPinia()],
      stubs: { 'router-link': true, 'title-bar': true },
      mocks: { $route: { params: { id: '0' }, query }, $router: { push: vi.fn() } }
    }
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mePermissions = ['orders_admin']
  get.mockClear(); put.mockClear()
})

describe('a delivery point from an approved request (issues/357, seguiment)', () => {
  it('starts filled with the request: member, names, address, town and CP, slots, notes', async () => {
    const wrapper = await mountForm()
    expect(wrapper.vm.form).toMatchObject({
      owner: 5, trade_name: 'Bar Nou', name: 'Bar Nou', address: 'C/ Major 1', city: 'Vic', postcode: '08500',
      notes: 'Porta lateral', time_slot_1_ini: 8, time_slot_1_end: 14, time_slot_2_ini: 16, time_slot_2_end: 19
    })
    expect(wrapper.vm.form.notes_delivery).toContain('Horari indicat a la consulta: de 8 a 14 i de 16 a 19 h')
    expect(wrapper.vm.citySearch).toBe('Vic')
    expect(wrapper.vm.slot1Closed).toBe(false)
    expect(wrapper.vm.slot2Closed).toBe(false)
    expect(wrapper.find('[data-test="point-from-request"]').text()).toContain('Formatges Serra')
  })

  it('links the created point to the request, once', async () => {
    const wrapper = await mountForm()
    await wrapper.vm.linkRequest(40)
    expect(put).toHaveBeenCalledWith('delivery-point-requests/7', { data: { contact: 40 } })
    await wrapper.vm.linkRequest(41)
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('only the office, and only with ?consulta', async () => {
    mePermissions = ['orders']
    let wrapper = await mountForm()
    expect(get).not.toHaveBeenCalledWith('delivery-point-requests/7', expect.anything())
    expect(wrapper.vm.form.trade_name).toBeUndefined()
    mePermissions = ['orders_admin']
    wrapper = await mountForm({})
    expect(wrapper.vm.fromRequest).toBeNull()
    expect(wrapper.find('[data-test="point-from-request"]').exists()).toBe(false)
  })
})
