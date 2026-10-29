// «Claus d'API» on Administració › Usuàries (integrations API, 2026-10-29):
// the office creates a key for a member's own system (La Dotzena's), sees it
// once to copy it, lists the keys by prefix and revokes them. Only users with
// the orders permission can have one.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const post = vi.fn()
const del = vi.fn()
vi.mock('@/service/index', () => ({
  default: () => ({ get, post, delete: del })
}))

import UserApiKeys from '@/components/UserApiKeys.vue'

const key = over => ({
  id: 1,
  user: 65,
  name: 'Sistema La Dotzena',
  prefix: 'esk_P--5REIZ',
  createdAt: '2026-10-29T19:11:32.196Z',
  lastUsedAt: null,
  revokedAt: null,
  active: true,
  ...over
})

const mountKeys = (props = {}) => mount(UserApiKeys, {
  props: { userId: '65', canHave: true, ...props },
  global: { plugins: [Buefy] }
})

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  del.mockReset()
})

describe('UserApiKeys', () => {
  it("lists the user's keys by name and prefix, never the key", async () => {
    get.mockResolvedValue({ data: [key(), key({ id: 2, name: null, active: false, revokedAt: '2026-10-29T20:00:00Z' })] })
    const w = mountKeys()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('integrations/api-keys?user=65')
    const rows = w.findAll('[data-test="api-key-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Sistema La Dotzena')
    expect(rows[0].text()).toContain('esk_P--5REIZ…')
    expect(rows[0].find('[data-test="api-key-revoke"]').exists()).toBe(true)
    expect(rows[1].text()).toContain('Sense nom')
    expect(rows[1].text()).toContain('Revocada')
    expect(rows[1].find('[data-test="api-key-revoke"]').exists()).toBe(false)
  })

  it('shows the new key once, until «Fet»', async () => {
    get.mockResolvedValue({ data: [] })
    post.mockResolvedValue({ data: { ...key(), key: 'esk_P--5REIZsecretsecret' } })
    const w = mountKeys()
    await flushPromises()
    await w.vm.create('Sistema La Dotzena')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('integrations/api-keys', { user: 65, name: 'Sistema La Dotzena' })
    expect(w.find('[data-test="api-key-value"]').text()).toBe('esk_P--5REIZsecretsecret')
    await w.find('[data-test="api-key-done"]').trigger('click')
    expect(w.find('[data-test="api-key-new"]').exists()).toBe(false)
  })

  it('revokes a key and reloads the list', async () => {
    get.mockResolvedValue({ data: [key()] })
    del.mockResolvedValue({ data: key({ active: false }) })
    const w = mountKeys()
    await flushPromises()
    await w.vm.revoke(key())
    await flushPromises()
    expect(del).toHaveBeenCalledWith('integrations/api-keys/1')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('offers no key to a user without the orders permission', async () => {
    get.mockResolvedValue({ data: [] })
    const w = mountKeys({ canHave: false })
    await flushPromises()
    expect(w.find('[data-test="api-key-create"]').exists()).toBe(false)
    expect(w.find('[data-test="api-keys-no-orders"]').exists()).toBe(true)
  })
})
