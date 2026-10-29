// «Claus d'API» on Administració › Usuàries (integrations API, 2026-10-29):
// the office creates a key for a member's own system (La Dotzena's), sees it
// once to copy it, lists the keys by prefix and revokes them. The section shows
// only for users with the orders permission (Logística): the API writes orders.
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
import AdminUserForm from '@/components/AdminUserForm.vue'

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
  props: { userId: '65', ...props },
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
})

describe('AdminUserForm › Claus d\'API', () => {
  const mountForm = permissions => {
    get.mockImplementation(async url => {
      if (url === 'users/me') return { data: { permissions: [{ permission: 'admin' }] } }
      if (url === '/users/65') return { data: { username: 'La Dotzena', permissions: permissions.map(permission => ({ permission })) } }
      if (url === '/users-permissions/roles') return { data: { roles: [] } }
      return { data: [] }
    })
    return mount(AdminUserForm, {
      props: { userId: '65' },
      global: { plugins: [Buefy], stubs: { UserApiKeys: true, 'router-link': true } }
    })
  }

  it('shows the section to a Logística user', async () => {
    const w = mountForm(['orders'])
    await flushPromises()
    expect(w.findComponent(UserApiKeys).exists()).toBe(true)
  })

  it('hides it from anyone else', async () => {
    const w = mountForm(['projects', 'hours'])
    await flushPromises()
    expect(w.findComponent(UserApiKeys).exists()).toBe(false)
  })
})
