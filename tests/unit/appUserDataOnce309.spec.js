// issues/309: every page load asked users/me, users/me/home, tasks and
// task-comments twice. App.vue loads the user on created() and again on the
// window's first focus: the 15-minute throttle of the focus refresh started at
// 0, so the first focus after a load (the reloaded page getting the focus)
// always passed it. When that focus came while the first users/me was still on
// its way, both answers filled the menu: every group twice.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const ME = { id: 15, username: 'jordi', permissions: [{ permission: 'projects' }] }
// users/me answers when the test says so while `held` is an array
let held = null
const api = {
  get: vi.fn(async url => {
    if (url === 'users/me' && held) return new Promise(resolve => held.push(() => resolve({ data: ME })))
    if (url === 'users/me') return { data: ME }
    if (url === 'users/me/home') return { data: { home: null } }
    return { data: [] }
  }),
  put: vi.fn(),
  post: vi.fn()
}
vi.mock('@/service/index', () => ({ default: () => api }))
import App from '@/App.vue'

const calls = url => api.get.mock.calls.filter(c => c[0] === url).length
const callsStarting = prefix => api.get.mock.calls.filter(c => c[0].startsWith(prefix)).length
const groups = w => w.vm.menuList.filter(m => typeof m === 'string')
const answerMe = async () => {
  await flushPromises()
  held.forEach(answer => answer())
  held = null
  await flushPromises()
}

async function mountApp () {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/tresoreria', component: { template: '<div/>' } }]
  })
  await router.push('/tresoreria')
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(App, {
    global: {
      plugins: [pinia, Buefy, router],
      stubs: { NavBar: true, AsideMenu: true, FooterBar: true, ModalBoxInvoice: true }
    }
  })
}

let now
beforeEach(() => {
  api.get.mockClear()
  held = null
  localStorage.setItem('user', JSON.stringify({ id: 15, username: 'jordi' }))
  localStorage.setItem('jwt', 'token')
  now = 1_800_000_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem('user')
  localStorage.removeItem('jwt')
})

describe('App loads the user once per page load (issues/309)', () => {
  it('a focus while users/me is on its way asks nothing again and keeps one menu', async () => {
    held = []
    const w = await mountApp()
    window.dispatchEvent(new Event('focus'))
    await answerMe()

    expect(calls('users/me')).toBe(1)
    expect(calls('users/me/home')).toBe(1)
    expect(callsStarting('tasks?')).toBe(1)
    expect(callsStarting('task-comments?')).toBe(1)
    expect(groups(w)).toEqual(['', 'Projectes', 'Diners', 'Informes', 'Altres'])
  })

  it('a focus after the load asks nothing again either', async () => {
    await mountApp()
    await flushPromises()
    now += 60 * 1000
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(calls('users/me')).toBe(1)
    expect(calls('users/me/home')).toBe(1)
  })

  it('still refreshes the user on a focus 15 minutes later, with one menu', async () => {
    const w = await mountApp()
    await flushPromises()
    const menu = w.vm.menuList.length
    expect(menu).toBeGreaterThan(0)
    now += 15 * 60 * 1000 + 1
    window.dispatchEvent(new Event('focus'))
    await flushPromises()

    expect(calls('users/me')).toBe(2)
    expect(w.vm.menuList.length).toBe(menu)
  })

  it('two loads at once still give one menu', async () => {
    held = []
    const w = await mountApp()
    w.vm.loadUserData()
    await answerMe()
    expect(calls('users/me')).toBe(2)
    expect(groups(w)).toEqual(['', 'Projectes', 'Diners', 'Informes', 'Altres'])
  })
})
