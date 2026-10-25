// Inici: the menu entries pinned with a star and the page opened after login
// (mockup docs/redisseny-v2/screens/A-Inici.html).
import { describe, it, expect, beforeEach, vi } from 'vitest'

// the API: GET/PUT users/me/home
const api = vi.hoisted(() => ({ home: null, fail: false, put: null }))
vi.mock('@/service/index', () => ({
  default: () => ({
    get: vi.fn(async () => ({ data: { home: api.home } })),
    put: (...args) => api.put(...args)
  })
}))
import { setActivePinia, createPinia } from 'pinia'
import menu from '@/service/menu'
import {
  HOME_PATH, defaultPrefs, dropPin, homeKey, landingFor, landingForUser, menuGroups,
  movePin, parsePrefs, readPrefs, visiblePins, writePrefs
} from '@/domain/home'
import { useHomePins } from '@/stores/homePins'
import { useMainStore } from '@/stores/main.js'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
import AsideMenuItem from '@/components/AsideMenuItem.vue'

const paths = groups => groups.flatMap(g => g.items.map(i => i.to))

describe('Inici', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    api.fail = false
    api.put = vi.fn(async (url, body) => {
      if (api.fail) throw new Error('403')
      api.home = body
      return { data: { home: body } }
    })
  })

  it('offers the menu entries the person may open, without Inici and Tiquets', () => {
    const staff = menuGroups(menu, ['projects', 'hours'])
    expect(staff.map(g => g.label)).toEqual(['Projectes', 'Diners', 'Informes', 'Altres'])
    expect(paths(staff)).toContain('/tasks')
    expect(paths(staff)).not.toContain(HOME_PATH)
    expect(paths(staff)).not.toContain('/orders')
    expect(staff.flatMap(g => g.items).some(i => i.action === 'tickets')).toBe(false)

    // Altres › Documentació (the user manual) is for everybody.
    const driver = menuGroups(menu, ['orders_delivery'])
    expect(driver.map(g => g.label)).toEqual(['Logística', 'Rutes i punts', 'Altres'])
    expect(menuGroups(menu, ['admin']).map(g => g.label)).toEqual(['Administració', 'Altres'])
    for (const permissions of [['hours'], ['orders'], ['orders_delivery'], ['admin'], ['projects']]) {
      expect(paths(menuGroups(menu, permissions))).toContain('/documentacio')
    }
  })

  it('starts with four entries the person can open', () => {
    expect(defaultPrefs(paths(menuGroups(menu, ['projects', 'hours'])))).toEqual({
      pins: ['/projectes', '/dedicacio', '/tasks', '/emitted-invoices'], landing: 'home'
    })
    expect(defaultPrefs(paths(menuGroups(menu, ['hours']))).pins).toEqual(['/dedicacio'])
    expect(defaultPrefs(paths(menuGroups(menu, ['orders_delivery']))).pins).toEqual(['/orders', '/incidences', '/order-operations'])
  })

  it('saves per person and ignores what it cannot read', () => {
    expect(writePrefs(7, { pins: ['/vat', '/tasks'], landing: 'first' })).toBe(true)
    expect(localStorage.getItem(homeKey(7))).toBe('{"pins":["/vat","/tasks"],"landing":"first"}')
    expect(readPrefs(7)).toEqual({ pins: ['/vat', '/tasks'], landing: 'first' })
    expect(readPrefs(8)).toBe(null)
    expect(parsePrefs('not json')).toBe(null)
    expect(parsePrefs({ pins: ['/vat', '/vat', 3, ''], landing: 'elsewhere' })).toEqual({ pins: ['/vat'], landing: 'home' })
  })

  it('hides the pins the person may no longer open, without forgetting them', () => {
    const pins = ['/tresoreria', '/dedicacio', '/administracio/users']
    expect(visiblePins(pins, ['hours'])).toEqual(['/dedicacio'])
    expect(visiblePins(pins, ['projects', 'hours', 'admin'])).toEqual(pins)
  })

  it('opens Inici after login unless the person chose otherwise', () => {
    expect(landingFor(null, ['projects'])).toBe(HOME_PATH)
    expect(landingFor({ pins: [], landing: 'home' }, ['orders'])).toBe(HOME_PATH)
    expect(landingFor({ pins: [], landing: 'usual' }, ['projects'])).toBe('/projectes')
    expect(landingFor({ pins: [], landing: 'usual' }, ['hours'])).toBe('/dedicacio')
    expect(landingFor({ pins: ['/tresoreria', '/dedicacio'], landing: 'first' }, ['hours'])).toBe('/dedicacio')
    expect(landingFor({ pins: ['/tresoreria'], landing: 'first' }, ['hours'])).toBe(HOME_PATH)
    writePrefs(3, { pins: ['/vat'], landing: 'first' })
    expect(landingForUser(3, ['projects'])).toBe('/vat')
  })

  it('reorders by arrows and by drag', () => {
    const pins = ['/a', '/b', '/c']
    expect(movePin(pins, '/b', -1)).toEqual(['/b', '/a', '/c'])
    expect(movePin(pins, '/c', 1)).toBe(pins)
    expect(dropPin(pins, '/c', '/a')).toEqual(['/c', '/a', '/b'])
    expect(dropPin(pins, '/a', '/c')).toEqual(['/b', '/a', '/c'])
    expect(dropPin(pins, '/a', '/a')).toBe(pins)
  })

  it('the store saves each star on the person\'s user, one PUT after another', async () => {
    api.home = null
    useMainStore().setUser({ user: { id: 5, permissions: [{ permission: 'projects' }] }, name: 'laia' })
    localStorage.setItem('user', JSON.stringify({ id: 5, permissions: [{ permission: 'projects' }] }))
    const store = useHomePins()
    await store.load()
    expect(store.pins).toEqual(['/projectes', '/tasks', '/emitted-invoices'])
    expect(api.put).not.toHaveBeenCalled()
    store.toggle('/vat')
    expect(store.isPinned('/vat')).toBe(true)
    await store.toggle('/projectes')
    expect(api.put.mock.calls.map(c => c[1].pins)).toEqual([
      ['/projectes', '/tasks', '/emitted-invoices', '/vat'],
      ['/tasks', '/emitted-invoices', '/vat']
    ])
    expect(api.put.mock.calls[0][0]).toBe('users/me/home')
    expect(readPrefs(5).pins).toEqual(store.pins)
    await store.setLanding('usual')
    expect(api.home).toEqual({ pins: ['/tasks', '/emitted-invoices', '/vat'], landing: 'usual' })
    expect(store.saveFailed).toBe(false)
  })

  it('takes the saved Inici from the API, whatever this browser had', async () => {
    api.home = { pins: ['/salary'], landing: 'first' }
    writePrefs(5, { pins: ['/vat'], landing: 'home' })
    localStorage.setItem('user', JSON.stringify({ id: 5, permissions: [{ permission: 'projects' }] }))
    const store = useHomePins()
    await store.load()
    expect(store.pins).toEqual(['/salary'])
    expect(store.landing).toBe('first')
    expect(readPrefs(5)).toEqual({ pins: ['/salary'], landing: 'first' })
  })

  it('keeps the local copy and says so when the API refuses', async () => {
    api.home = null
    api.fail = true
    localStorage.setItem('user', JSON.stringify({ id: 5, permissions: [{ permission: 'projects' }] }))
    const store = useHomePins()
    await store.load()
    await store.toggle('/vat')
    expect(store.saveFailed).toBe(true)
    expect(readPrefs(5).pins).toContain('/vat')
  })

  // 2026-10-18: a star you could click in the side menu was too easy to set by
  // mistake; the menu only shows what is pinned, Inici is where it changes
  it('the side menu shows the pinned entries but has nothing to click on them', () => {
    const store = useHomePins()
    store.pins = ['/vat']
    const item = to => mount(AsideMenuItem, {
      props: { item: { to, icon: 'percent-outline', label: 'IVA' } },
      global: { plugins: [Buefy], stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })
    const pinned = item('/vat')
    expect(pinned.find('.menu-pin').exists()).toBe(true)
    expect(pinned.find('button').exists()).toBe(false)
    expect(pinned.text()).toContain("fixat a l'inici")
    expect(item('/tasks').find('.menu-pin').exists()).toBe(false)
    expect(item(HOME_PATH).find('.menu-pin').exists()).toBe(false)
  })
})
