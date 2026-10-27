// issues/353: the side menu had four entries for the routes screens
// (Poblacions i rutes, Poblacions i punts, Rutes i dies, Rutes) that already
// share tabs. Now one entry, «Poblacions i rutes», opens them and stays
// highlighted on any of them; the rest are tabs.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import menuList from '@/service/menu'
import RoutesTabs, { TABS, isRoutesScreenPath } from '@/components/RoutesTabs.vue'
import AsideMenuItem from '@/components/AsideMenuItem.vue'
import { createPinia, setActivePinia } from 'pinia'

const SCREENS = ['/poblacions-rutes', '/rutes-dies', '/simulador-logistic', '/poblacions-punts-entrega', '/rutes']

describe('one menu entry for the routes screens (issues/353)', () => {
  it('«Rutes i punts» has «Poblacions i rutes» and none of the other screens', () => {
    const items = menuList[menuList.indexOf('Rutes i punts') + 1]
    const paths = items.map(i => i.to)
    expect(paths).toContain('/poblacions-rutes')
    for (const p of SCREENS.filter(p => p !== '/poblacions-rutes')) expect(paths).not.toContain(p)
  })

  it('every screen is a tab, «Poblacions i rutes» first', () => {
    expect(TABS.map(t => t.to)).toEqual(SCREENS)
    for (const p of SCREENS) expect(isRoutesScreenPath(p)).toBe(true)
    expect(isRoutesScreenPath('/comandes')).toBe(false)
  })

  it('the entry is highlighted on any of the screens', async () => {
    const item = menuList[menuList.indexOf('Rutes i punts') + 1].find(i => i.to === '/poblacions-rutes')
    setActivePinia(createPinia())
    for (const [path, active] of [['/rutes-dies', true], ['/simulador-logistic', true], ['/comandes', false]]) {
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)', component: { template: '<div />' } }] })
      await router.push(path)
      const w = mount(AsideMenuItem, { props: { item }, global: { plugins: [router], stubs: { 'b-icon': true } } })
      expect(w.vm.isActiveGroup).toBe(active)
    }
  })

  it('the tabs open the screens', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)', component: { template: '<div />' } }] })
    await router.push('/rutes-dies')
    const w = mount(RoutesTabs, { props: { isStaff: true, isOffice: true }, global: { plugins: [router] } })
    expect(w.findAll('a').map(a => a.text())).toEqual(['Poblacions i rutes', 'Rutes i dies', 'Simulador', 'Poblacions i punts', 'Rutes'])
  })
})
