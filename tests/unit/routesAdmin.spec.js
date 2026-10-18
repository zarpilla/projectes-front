// issues/141: routes could only be created or switched off on the server. The
// office (orders_admin) now does it from «Rutes i punts › Rutes»: a new route,
// its days, its driver, its transfers and its volume discount, and an active
// switch instead of deleting it.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import {
  routeToForm,
  validateRoute,
  routePayload,
  sortRoutes,
  routeDaysShort,
  deliveryUserOptions
} from '@/domain/routeForm'
import { routePermissions, canOpenPath } from '@/domain/routeAccess'
import menuList from '@/service/menu'
import RoutesTabs from '@/components/RoutesTabs.vue'

const ROUTES = [
  { id: 1, name: 'Girona', order: 2, active: true, monday: true },
  { id: 2, name: 'Vic', order: 1, active: false, friday: true },
  { id: 3, name: 'Olot', order: 3, active: true, wednesday: true }
]

describe('route form (issues/141)', () => {
  it('starts a new route active, after the last one, with no days', () => {
    const form = routeToForm(null, ROUTES)
    expect(form).toMatchObject({ id: null, name: '', order: 4, active: true, monday: false, is_transfer_route: false })
  })

  it('loads a route with its relations as ids', () => {
    const form = routeToForm({ ...ROUTES[0], delivery_user: { id: 9 }, transfer_pickup: { id: 4 }, is_transfer_route: true })
    expect(form).toMatchObject({ id: 1, name: 'Girona', order: 2, active: true, monday: true, delivery_user: 9, transfer_pickup: 4 })
  })

  it('needs a name not used by another route and at least one day', () => {
    expect(validateRoute(routeToForm(null, ROUTES), ROUTES)).toMatchObject({ name: 'Cal un nom', days: expect.any(String) })
    expect(validateRoute({ ...routeToForm(null), name: ' girona ', tuesday: true }, ROUTES).name).toMatch(/Ja hi ha/)
    // the route itself keeps its name
    expect(validateRoute(routeToForm(ROUTES[0]), ROUTES)).toEqual({})
  })

  it('needs both halves of the volume discount, and a destination for transfers', () => {
    const base = { ...routeToForm(null), name: 'Nova', monday: true }
    expect(validateRoute({ ...base, volume_discount_price: '2' }, ROUTES).volume_discount).toBeTruthy()
    expect(validateRoute({ ...base, volume_discount_price: '2', volume_discount_number_of_orders: 5 }, ROUTES)).toEqual({})
    expect(validateRoute({ ...base, is_transfer_route: true }, ROUTES).transfer_pickup).toBeTruthy()
  })

  it('saves trimmed text, numbers and ids, and no transfer point on a route that does not transfer', () => {
    const data = routePayload({
      ...routeToForm(null, ROUTES),
      name: '  Nova  ',
      short_name: ' ',
      monday: true,
      volume_discount_price: '1,5',
      volume_discount_number_of_orders: '10',
      transfer_pickup: 4,
      delivery_user: { id: 9 }
    })
    expect(data).toMatchObject({
      name: 'Nova',
      short_name: null,
      order: 4,
      active: true,
      monday: true,
      tuesday: false,
      transfer_pickup: null,
      delivery_user: 9,
      volume_discount_price: 1.5,
      volume_discount_number_of_orders: 10
    })
    expect(data).not.toHaveProperty('id')
  })

  it('lists the active routes first, by order', () => {
    expect(sortRoutes(ROUTES).map(r => r.name)).toEqual(['Girona', 'Olot', 'Vic'])
    expect(routeDaysShort({ monday: true, friday: true })).toBe('Dl, Dv')
  })

  it('offers the drivers, keeping the current one', () => {
    const users = [
      { id: 1, fullname: 'Pere', permissions: [{ permission: 'orders_delivery' }] },
      { id: 2, fullname: 'Anna', permissions: [{ permission: 'projects' }] },
      { id: 3, fullname: 'Joan', permissions: [], blocked: true },
      { id: 4, fullname: 'Marta', permissions: [] }
    ]
    expect(deliveryUserOptions(users, 4).map(u => u.name)).toEqual(['Marta', 'Pere'])
    // without permissions in the list, everyone not blocked
    expect(deliveryUserOptions([{ id: 1, username: 'b' }, { id: 2, username: 'a' }]).map(u => u.id)).toEqual([2, 1])
  })
})

describe('«Rutes» page (issues/141)', () => {
  it('opens for the office only', () => {
    expect(routePermissions({ path: '/routes', meta: {} })).toEqual(['orders_admin'])
    expect(canOpenPath('/routes', ['orders_admin'])).toBe(true)
    expect(canOpenPath('/routes', ['orders'])).toBe(false)
    expect(canOpenPath('/routes', ['orders_delivery'])).toBe(false)
  })

  it('is in the menu under «Rutes i punts»', () => {
    const i = menuList.indexOf('Rutes i punts')
    const item = menuList[i + 1].find(m => m.to === '/routes')
    expect(item).toMatchObject({ label: 'Rutes', permission: 'orders_admin' })
  })

  const tabs = async props => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)', component: { template: '<div />' } }] })
    await router.push('/route-days')
    const w = mount(RoutesTabs, { props, global: { plugins: [router] } })
    return w.findAll('a').map(a => a.text())
  }

  it('shows the «Rutes» tab to the office', async () => {
    expect(await tabs({ isStaff: true, isOffice: true })).toContain('Rutes')
    expect(await tabs({ isStaff: true })).not.toContain('Rutes')
    expect(await tabs({})).not.toContain('Rutes')
  })
})
