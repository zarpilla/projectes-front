// issues/019 — "Tiquets" item in the side menu opens the tickets site logged in.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
import { openTickets, ticketsErrorMessage } from '@/service/tickets'
import AsideMenuList from '@/components/AsideMenuList.vue'
import menu from '@/service/menu'

const fakeApi = (get) => vi.fn(() => ({ get }))

describe('openTickets', () => {
  it('opens a tab in the click and points it at the login URL from the API', async () => {
    const tab = { location: { href: '' }, opener: 'esstrapis', close: vi.fn() }
    const open = vi.fn(() => tab)
    const get = vi.fn().mockResolvedValue({ data: { url: 'https://tiquets.esstrapis.org/sso?tenant=a&token=t' } })
    const api = fakeApi(get)

    const pending = openTickets({ open, api })
    // The tab must open before the API call resolves, or popup blockers stop it.
    expect(open).toHaveBeenCalledWith('', '_blank')
    await pending

    expect(api).toHaveBeenCalledWith({ requiresAuth: true })
    expect(get).toHaveBeenCalledWith('me/tickets-login')
    expect(tab.location.href).toBe('https://tiquets.esstrapis.org/sso?tenant=a&token=t')
    expect(tab.opener).toBeNull()
    expect(tab.close).not.toHaveBeenCalled()
  })

  it('falls back to opening the URL when the blank tab was blocked', async () => {
    const open = vi.fn(() => null)
    const get = vi.fn().mockResolvedValue({ data: { url: 'https://t.example/sso?x' } })
    await openTickets({ open, api: fakeApi(get) })
    expect(open).toHaveBeenLastCalledWith('https://t.example/sso?x', '_blank', 'noopener')
  })

  it('closes the tab and rethrows when the API fails or returns no usable URL', async () => {
    for (const get of [
      vi.fn().mockRejectedValue({ response: { data: { error: { message: 'Tickets are not configured on this instance' } } } }),
      vi.fn().mockResolvedValue({ data: { url: 'javascript:alert(1)' } }),
    ]) {
      const tab = { location: { href: '' }, close: vi.fn() }
      await expect(openTickets({ open: () => tab, api: fakeApi(get) })).rejects.toBeTruthy()
      expect(tab.close).toHaveBeenCalled()
      expect(tab.location.href).toBe('')
    }
  })
})

describe('ticketsErrorMessage', () => {
  it('translates the API errors', () => {
    const apiError = (message) => ({ response: { data: { error: { message } } } })
    expect(ticketsErrorMessage(apiError('Tickets are not configured on this instance'))).toBe('Els tiquets no estan configurats en aquesta instància')
    expect(ticketsErrorMessage(apiError('Your user has no email address'))).toBe('El teu usuari no té adreça de correu')
    expect(ticketsErrorMessage(apiError('Forbidden'))).toBe("No s'ha pogut obrir els tiquets")
    expect(ticketsErrorMessage(new Error("No s'ha pogut obtenir l'enllaç als tiquets"))).toBe("No s'ha pogut obtenir l'enllaç als tiquets")
  })
})

describe('side menu', () => {
  const ticketsItem = menu[menu.indexOf('Altres') + 1].find((i) => i.action === 'tickets')

  it('has a Tiquets item under Altres', () => {
    expect(ticketsItem).toMatchObject({ label: 'Tiquets', icon: 'ticket-outline', permission: 'projects' })
  })

  it('emits the click once and does not navigate', async () => {
    const wrapper = mount(AsideMenuList, {
      props: { menu: [ticketsItem] },
      global: { plugins: [Buefy] },
    })
    const link = wrapper.find('a')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('menu-click')).toEqual([[ticketsItem]])
  })
})
