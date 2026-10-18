// Altres › Documentació opens the documentation site (esstrapis-docs) logged in.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { openDocs, docsErrorMessage } from '@/service/docs'

const fakeApi = (get) => vi.fn(() => ({ get }))

vi.mock('@/service/docs', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, openDocs: vi.fn(real.openDocs) }
})

describe('openDocs', () => {
  it('opens a tab in the click and points it at the login URL from the API', async () => {
    const tab = { location: { href: '' }, opener: 'esstrapis', close: vi.fn() }
    const open = vi.fn(() => tab)
    const get = vi.fn().mockResolvedValue({ data: { url: 'https://docs.esstrapis.org/sso?token=t' } })
    const api = fakeApi(get)

    const pending = openDocs({ open, api })
    // The tab must open before the API call resolves, or popup blockers stop it.
    expect(open).toHaveBeenCalledWith('', '_blank')
    await pending

    expect(api).toHaveBeenCalledWith({ requiresAuth: true })
    expect(get).toHaveBeenCalledWith('me/docs-login', undefined)
    expect(tab.location.href).toBe('https://docs.esstrapis.org/sso?token=t')
    expect(tab.opener).toBeNull()
  })

  it('sends the screen for contextual help', async () => {
    const get = vi.fn().mockResolvedValue({ data: { url: 'https://d.example/sso?token=t' } })
    await openDocs({ route: '/tresoreria', open: () => ({ location: {} }), api: fakeApi(get) })
    expect(get).toHaveBeenCalledWith('me/docs-login', { params: { route: '/tresoreria' } })
  })

  it('falls back to opening the URL when the blank tab was blocked', async () => {
    const open = vi.fn(() => null)
    const get = vi.fn().mockResolvedValue({ data: { url: 'https://d.example/sso?x' } })
    await openDocs({ open, api: fakeApi(get) })
    expect(open).toHaveBeenLastCalledWith('https://d.example/sso?x', '_blank', 'noopener')
  })

  it('closes the tab and rethrows when the API fails or returns no usable URL', async () => {
    for (const get of [
      vi.fn().mockRejectedValue({ response: { data: { error: { message: 'Documentation is not configured on this instance' } } } }),
      vi.fn().mockResolvedValue({ data: { url: 'javascript:alert(1)' } }),
    ]) {
      const tab = { location: { href: '' }, close: vi.fn() }
      await expect(openDocs({ open: () => tab, api: fakeApi(get) })).rejects.toBeTruthy()
      expect(tab.close).toHaveBeenCalled()
      expect(tab.location.href).toBe('')
    }
  })
})

describe('docsErrorMessage', () => {
  it('translates the API errors', () => {
    const apiError = (message) => ({ response: { data: { error: { message } } } })
    expect(docsErrorMessage(apiError('Documentation is not configured on this instance'))).toBe('La documentació no està configurada en aquesta instància')
    expect(docsErrorMessage(apiError('Forbidden'))).toBe("No s'ha pogut obrir la documentació")
    expect(docsErrorMessage(new Error('x'))).toBe('x')
  })
})

describe('Documentation page', () => {
  it('opens the manual from its button', async () => {
    openDocs.mockClear()
    openDocs.mockImplementationOnce(() => Promise.resolve())
    const { default: Documentation } = await import('@/views/Documentation.vue')
    const wrapper = mount(Documentation, { global: { plugins: [Buefy], stubs: { TitleBar: true } } })
    const button = wrapper.findAll('button').find((b) => b.text().includes('Obre el manual'))
    await button.trigger('click')
    await flushPromises()
    expect(openDocs).toHaveBeenCalledTimes(1)
  })
})
