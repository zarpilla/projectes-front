// The top bar on phones and tablets: the logo in the middle takes you home,
// ☰ opens the side menu and the user icon opens the user menu.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/service/auth', () => ({ logout: vi.fn() }))

import NavBar from '@/components/NavBar.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { useMainStore } from '@/stores/main.js'

const mountBar = () => mount(NavBar, {
  global: {
    stubs: { RouterLink: RouterLinkStub, 'b-icon': { props: ['icon'], template: '<i :data-icon="icon" />' } },
    mocks: { $router: { afterEach: () => {} } }
  }
})
const icons = w => w.findAll('i').map(i => i.attributes('data-icon'))

describe('NavBar on mobile', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows the logo, linked to the home page', () => {
    const w = mountBar()
    const link = w.findComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'inici' })
    expect(link.findComponent(BrandLogo).exists()).toBe(true)
  })

  it('uses a hamburger for the side menu and a user icon for the user menu', async () => {
    const w = mountBar()
    expect(icons(w).slice(0, 2)).toEqual(['menu', 'account-circle-outline'])
    useMainStore().asideMobileStateToggle()
    await w.find('.navbar-item-menu-toggle').trigger('click')
    expect(icons(w).slice(0, 2)).toEqual(['close', 'close'])
  })
})
