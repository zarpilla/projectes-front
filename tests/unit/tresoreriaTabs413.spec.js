// issues/413: Conciliació is a tab of Tresoreria (?pestanya=conciliacio), not a
// screen of its own; /conciliacio still opens it
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import Tresoreria from '@/views/Tresoreria.vue'
import { canOpenPath } from '@/domain/routeAccess'
import menu from '@/service/menu'
import router from '@/router/index.js'
import { CHANGELOG } from '@/service/changelog'

const mountTresoreria = async (query = {}) => {
  const replace = vi.fn()
  const w = mount(Tresoreria, {
    global: {
      plugins: [Buefy],
      mocks: { $route: { query }, $router: { replace } },
      stubs: {
        'title-bar': { props: ['titleStack', 'subtitle'], template: '<h1>{{ titleStack.join(" / ") }}</h1>' },
        'tresoreria-table': { template: '<div class="treasury-stub" />' },
        'bank-reconciliation': { template: '<div class="recon-stub" />' }
      }
    }
  })
  await flushPromises()
  return { w, replace }
}

describe('Tresoreria tabs (issues/413)', () => {
  it('opens the forecast by default and Conciliació with ?pestanya=conciliacio', async () => {
    const plain = await mountTresoreria({ year: '2026' })
    expect(plain.w.find('.treasury-stub').exists()).toBe(true)
    expect(plain.w.find('.recon-stub').exists()).toBe(false)
    expect(plain.w.findAll('.treasury-tabs button').map(b => b.text())).toEqual(['Previsió i moviments', 'Conciliació'])
    await plain.w.findAll('.treasury-tabs button')[1].trigger('click')
    expect(plain.replace).toHaveBeenCalledWith({ query: { year: '2026', pestanya: 'conciliacio' } })

    const recon = await mountTresoreria({ pestanya: 'conciliacio' })
    await flushPromises()
    expect(recon.w.find('.recon-stub').exists()).toBe(true)
    expect(recon.w.find('.treasury-stub').exists()).toBe(false)
    expect(recon.w.find('h1').text()).toBe('Diners / Tresoreria / Conciliació')
    await recon.w.findAll('.treasury-tabs button')[0].trigger('click')
    expect(recon.replace).toHaveBeenCalledWith({ query: {} })
  })

  it('is not a menu entry; the old address redirects to the tab', () => {
    const entries = menu.flat(2).filter(e => e && e.to)
    expect(entries.some(e => /conciliacio/.test(e.to))).toBe(false)
    const route = router.getRoutes().find(r => r.path === '/conciliacio')
    expect(route.redirect).toEqual({ path: '/tresoreria', query: { pestanya: 'conciliacio' } })
  })

  it('the Novetats link opens for projects and not for orders', () => {
    const link = CHANGELOG.flatMap(e => e.items).flatMap(i => (Array.isArray(i.text) ? i.text : [])).find(s => s && s.label === 'Conciliació')
    expect(link.to).toBe('/tresoreria?pestanya=conciliacio')
    expect(canOpenPath(link.to, ['projects'])).toBe(true)
    expect(canOpenPath(link.to, ['orders'])).toBe(false)
  })
})
