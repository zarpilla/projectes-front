// issues/027 — "Crear usuari" failed unless a Rol was picked: the select started
// empty, the form posted role: null and Strapi 5 answers 400 "role must be a
// `object` type" (and "role is a required field" without the key). New users get
// the Authenticated role preselected, and a create that still has none (saved
// before the roles loaded) sends the Authenticated role.
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put: vi.fn() }) }))

import AdminUserForm from '@/components/AdminUserForm.vue'

const ROLES = [{ id: 2, name: 'Public', type: 'public' }, { id: 1, name: 'Authenticated', type: 'authenticated' }]

function vm (props = {}) {
  const ctx = {
    ...props,
    $buefy: {
      toast: { open: vi.fn() },
      dialog: { prompt: ({ onConfirm }) => onConfirm('Secret-123') }
    },
    $router: { push: vi.fn() }
  }
  Object.assign(ctx, AdminUserForm.data.call(ctx))
  for (const [name, fn] of Object.entries(AdminUserForm.methods)) ctx[name] = fn.bind(ctx)
  return ctx
}

describe('AdminUserForm role', () => {
  it('preselects the Authenticated role for a new user', async () => {
    get.mockResolvedValueOnce({ data: { roles: ROLES } })
    const form = vm({ userId: null })
    await form.loadRoles()
    expect(form.form.role).toBe(1)
  })

  it('keeps the role of an existing user', async () => {
    get.mockResolvedValueOnce({ data: { roles: ROLES } })
    const form = vm({ userId: '7' })
    form.form.role = 2
    await form.loadRoles()
    expect(form.form.role).toBe(2)
  })

  it('sends the Authenticated role when a create has none', async () => {
    get.mockResolvedValueOnce({ data: { roles: ROLES } })
    const form = vm({ userId: null })
    Object.assign(form.form, { username: 'nova', email: 'nova@exemple.coop', role: null })
    await form.submit()
    await vi.waitFor(() => expect(post).toHaveBeenCalled())
    const [, body] = post.mock.calls.at(-1)
    expect(body.role).toBe(1)
    expect(body.password).toBe('Secret-123')
  })
})
