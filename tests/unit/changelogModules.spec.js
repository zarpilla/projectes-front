// Every changelog entry says which modules it touches, so the Registre de
// canvis can be filtered by module.
import { describe, it, expect } from 'vitest'
import { CHANGELOG, CHANGELOG_MODULES, changelogItemVisible, visibleChangelog } from '@/service/changelog'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import ChangeLog from '@/views/ChangeLog.vue'

describe('changelog modules', () => {
  it('every item has at least one known module', () => {
    CHANGELOG.flatMap(e => e.items).forEach(item => {
      expect(item.modules?.length).toBeGreaterThan(0)
      item.modules.forEach(m => expect(CHANGELOG_MODULES).toContain(m))
    })
  })
})

describe('Registre de canvis filtered by module', () => {
  it('shows only the items that touch the chosen module', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }] })
    await router.push('/')
    const wrapper = mount(ChangeLog, { global: { plugins: [router, Buefy] } })
    const items = () => wrapper.findAll('.news-day li')
    // some shown items are about other modules (counts don't compare: both
    // views show the latest 10 days, of different items)
    expect(items().some(li => !li.find('.news-modules').text().includes('Logística'))).toBe(true)
    await wrapper.find('.filter-select select').setValue('Logística')
    expect(items().length).toBeGreaterThan(0)
    items().forEach(li => expect(li.find('.news-modules').text()).toContain('Logística'))
  })
})

describe('Novetats by permission', () => {
  const item = modules => ({ modules })

  it('logistics entries only for orders, orders_admin and orders_delivery', () => {
    ;['orders', 'orders_admin', 'orders_delivery'].forEach(p => expect(changelogItemVisible(item(['Logística']), [p])).toBe(true))
    expect(changelogItemVisible(item(['Logística']), ['hours'])).toBe(false)
    expect(changelogItemVisible(item(['Logística']), ['projects'])).toBe(false)
  })

  it('projects, hours, money… only for projects or hours', () => {
    ;['Projectes', 'Hores', 'Diners', 'Subvencions', 'Informes', 'Integracions'].forEach(m => {
      expect(changelogItemVisible(item([m]), ['projects'])).toBe(true)
      expect(changelogItemVisible(item([m]), ['hours'])).toBe(true)
      expect(changelogItemVisible(item([m]), ['orders'])).toBe(false)
      expect(changelogItemVisible(item([m]), ['orders_delivery'])).toBe(false)
    })
  })

  it('an entry shows when any of its modules is hers', () => {
    expect(changelogItemVisible(item(['Diners', 'Logística']), ['orders'])).toBe(true)
    expect(changelogItemVisible(item(['Administració', 'Logística']), ['orders_admin'])).toBe(true)
    expect(changelogItemVisible(item(['Administració']), ['orders_admin', 'projects'])).toBe(false)
  })

  it('Plataforma for everyone, admin and unknown permissions see all', () => {
    expect(changelogItemVisible(item(['Plataforma']), [])).toBe(true)
    expect(changelogItemVisible(item(['Administració']), ['admin'])).toBe(true)
    expect(changelogItemVisible(item(['Logística']), ['admin'])).toBe(true)
    expect(changelogItemVisible(item(['Logística']), null)).toBe(true)
  })

  it('drops the days left empty', () => {
    const log = [
      { date: '2026.11.02', items: [item(['Logística'])] },
      { date: '2026.11.01', items: [item(['Logística']), item(['Diners'])] }
    ]
    expect(visibleChangelog(['hours'], log)).toEqual([{ date: '2026.11.01', items: [item(['Diners'])] }])
    expect(visibleChangelog(['orders'], log).map(e => e.items.length)).toEqual([1, 1])
  })

  it('a member sees only logistics and platform entries on the page', async () => {
    localStorage.setItem('user', JSON.stringify({ permissions: [{ permission: 'orders' }] }))
    try {
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }] })
      await router.push('/')
      const wrapper = mount(ChangeLog, { global: { plugins: [router, Buefy] } })
      const items = wrapper.findAll('.news-day li')
      expect(items.length).toBeGreaterThan(0)
      items.forEach(li => {
        const mods = li.find('.news-modules').text()
        expect(mods.includes('Logística') || mods.includes('Plataforma')).toBe(true)
      })
      const options = wrapper.findAll('.filter-select option').map(o => o.text())
      expect(options.some(o => o.startsWith('Subvencions'))).toBe(false)
    } finally {
      localStorage.removeItem('user')
    }
  })
})
