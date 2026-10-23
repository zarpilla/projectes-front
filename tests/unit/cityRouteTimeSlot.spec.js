// issues/314: «Poblacions i rutes» shows when we pass by each town (the
// route's slot, or the town's own one) and the office sets them with
// «Franges». Members only read them.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const put = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn(), delete: vi.fn() }) }))
import CityRoute from '@/views/CityRoute.vue'

const ROUTES = [
  { id: 16, name: 'DT - BCN CIUTAT', tuesday: true, active: true, order: 1, time_from: '09:00:00.000', time_to: '14:00:00.000' },
  { id: 11, name: 'DT - BAIX MONTSENY', tuesday: true, active: true, order: 2, time_from: null, time_to: null }
]
const CITIES = [{ id: 1, name: 'Badalona' }, { id: 2, name: 'Alella' }, { id: 3, name: 'Breda' }]
const LINKS = () => [
  { id: 159, city: { id: 1 }, route: ROUTES[0], time_from: '07:00:00.000', time_to: null },
  { id: 160, city: { id: 2 }, route: ROUTES[0], time_from: null, time_to: null },
  { id: 161, city: { id: 3 }, route: ROUTES[1], time_from: null, time_to: null }
]

const mountAs = async permissions => {
  const links = LINKS()
  get.mockImplementation(async url => {
    if (url === 'users/me') return { data: { permissions: permissions.map(permission => ({ permission })) } }
    if (url.startsWith('cities')) return { data: CITIES }
    if (url.startsWith('routes')) return { data: ROUTES.map(r => ({ ...r })) }
    if (url === 'city-routes/basic') return { data: links }
    return { data: [] }
  })
  const snackbar = { open: vi.fn() }
  const w = mount(CityRoute, {
    global: {
      plugins: [Buefy],
      mocks: { $buefy: { snackbar, dialog: { confirm: vi.fn() } } },
      stubs: { 'title-bar': true, 'routes-tabs': true, 'router-link': true }
    }
  })
  await flushPromises()
  return { w, snackbar }
}

// types a time and leaves the pair of inputs (the draft is saved on focusout)
const type = async (w, label, value, leave = true) => {
  const input = w.find(`input[aria-label="${label}"]`)
  input.element.value = value
  await input.trigger('input')
  if (leave) await input.trigger('focusout')
  await flushPromises()
}

beforeEach(() => {
  get.mockReset()
  put.mockReset()
  put.mockResolvedValue({ data: {} })
})

describe('«Poblacions i rutes» time slots (issues/314)', () => {
  it('a member sees the route slot, a town own slot, and «per definir»; no editing', async () => {
    const { w } = await mountAs(['orders'])
    const text = w.text()
    expect(text).toContain('de 9 a 14 h')
    expect(text).toMatch(/Badalona\s*a les 7 h/)
    expect(text).toContain('Franja per definir')
    expect(w.findAll('button').some(b => b.text() === 'Franges')).toBe(false)
  })

  it('the lookup lists day, route and slot of a town', async () => {
    const { w } = await mountAs(['orders'])
    w.vm.lookup = 'Alella'
    await flushPromises()
    expect(w.find('.lookup-list').text()).toMatch(/dimarts\s*DT - BCN CIUTAT\s*de 9 a 14 h/)
  })

  it('the office sets a town own slot and the route slot', async () => {
    const { w } = await mountAs(['orders_admin'])
    const toggle = w.findAll('button').find(b => b.text() === 'Franges')
    await toggle.trigger('click')

    await type(w, 'Franja de Alella a DT - BCN CIUTAT: de', '12:00')
    expect(put).toHaveBeenCalledWith('city-routes/160', { time_from: '12:00:00.000', time_to: null })
    expect(w.find('input[aria-label="Franja de Alella a DT - BCN CIUTAT: de"]').element.value).toBe('12:00')

    await type(w, 'Franja de DT - BCN CIUTAT: a', '15:00')
    expect(put).toHaveBeenCalledWith('routes/16', { time_from: '09:00:00.000', time_to: '15:00:00.000' })
  })

  it('typing both times saves once, when leaving the pair', async () => {
    const { w } = await mountAs(['orders_admin'])
    await w.findAll('button').find(b => b.text() === 'Franges').trigger('click')
    await type(w, 'Franja de Alella a DT - BCN CIUTAT: de', '12:00', false)
    await type(w, 'Franja de Alella a DT - BCN CIUTAT: a', '15:00')
    expect(put).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('city-routes/160', { time_from: '12:00:00.000', time_to: '15:00:00.000' })
    expect(w.find('.cr-slot-table').text()).toMatch(/Alella\s*a\s*de 12 a 15 h pròpia/)
  })

  it('«Torna a la de la ruta» clears the own slot', async () => {
    const { w } = await mountAs(['orders_admin'])
    await w.findAll('button').find(b => b.text() === 'Franges').trigger('click')
    await w.findAll('button').find(b => b.text() === 'Torna a la de la ruta').trigger('click')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('city-routes/159', { time_from: null, time_to: null })
    expect(w.find('.cr-slot-table').text()).toMatch(/Badalona\s*a\s*de 9 a 14 h la de la ruta/)
  })

  it('an invalid slot is not saved', async () => {
    const { w, snackbar } = await mountAs(['orders_admin'])
    await w.findAll('button').find(b => b.text() === 'Franges').trigger('click')
    await type(w, 'Franja de Alella a DT - BCN CIUTAT: a', '10:00')
    expect(put).not.toHaveBeenCalled()
    // the typed time stays, to be fixed
    expect(w.find('input[aria-label="Franja de Alella a DT - BCN CIUTAT: a"]').element.value).toBe('10:00')
    expect(snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })
})

describe('order form: when we pass (issues/314)', async () => {
  const { default: OrdersForm } = await import('@/components/OrdersForm.vue')
  const c = { form: { route: 16, contact_city_id: 1 }, cityRoutes: LINKS(), routeDays: OrdersForm.methods.routeDays }
  const link = OrdersForm.computed.routeSlotLink.call(c)

  it('shows the town own slot on the chosen route, else the route one', () => {
    expect(link.id).toBe(159)
    expect(OrdersForm.computed.routeSlotText.call({ ...c, routeSlotLink: link })).toBe('a les 7 h')
    expect(OrdersForm.computed.routeSlotDay.call({ ...c, routeSlotLink: link })).toBe('dimarts')
    const alella = OrdersForm.computed.routeSlotLink.call({ ...c, form: { route: { id: 16 }, contact_city_id: 2 } })
    expect(OrdersForm.computed.routeSlotText.call({ routeSlotLink: alella })).toBe('de 9 a 14 h')
    expect(OrdersForm.computed.routeSlotLink.call({ ...c, form: { route: null, contact_city_id: 1 } })).toBeNull()
  })
})
