// issues/017 — the user admin screen lets an orders_admin edit the user's
// multi-delivery discount and any admin set a new password for the user.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const put = vi.fn().mockResolvedValue({ data: {} })
const post = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))

import AdminUserForm from '@/components/AdminUserForm.vue'

const meWith = (...permissions) => ({ data: { permissions: permissions.map(permission => ({ permission })) } })

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

const lastPutBody = () => put.mock.calls.at(-1)[1]

describe('AdminUserForm multi-delivery discount', () => {
  beforeEach(() => {
    get.mockReset()
    put.mockClear()
  })

  it('shows the discount only to orders_admin', async () => {
    const admin = vm({ userId: '7' })
    get.mockResolvedValueOnce(meWith('admin'))
    await admin.loadMe()
    expect(admin.ordersAdmin).toBe(false)

    const ordersAdmin = vm({ userId: '7' })
    get.mockResolvedValueOnce(meWith('admin', 'orders_admin'))
    await ordersAdmin.loadMe()
    expect(ordersAdmin.ordersAdmin).toBe(true)
  })

  it('loads the discount of the user: only false turns it off', async () => {
    const form = vm({ userId: '7' })
    get.mockResolvedValueOnce({ data: { username: 'u', multidelivery_discount: false } })
    await form.loadData()
    expect(form.form.multidelivery_discount).toBe(false)

    get.mockResolvedValueOnce({ data: { username: 'u', multidelivery_discount: null } })
    await form.loadData()
    expect(form.form.multidelivery_discount).toBe(true)
  })

  it('saves the discount when an orders_admin edits the user', async () => {
    const form = vm({ userId: '7' })
    form.ordersAdmin = true
    form.form.multidelivery_discount = false
    await form.submit()
    expect(put.mock.calls.at(-1)[0]).toBe('/users/7')
    expect(lastPutBody().multidelivery_discount).toBe(false)
  })

  it('leaves the discount untouched when the admin is not orders_admin', async () => {
    const form = vm({ userId: '7' })
    await form.submit()
    expect(lastPutBody()).not.toHaveProperty('multidelivery_discount')
  })
})

describe('AdminUserForm password change', () => {
  beforeEach(() => put.mockClear())

  it('does not send a password when none is typed', async () => {
    const form = vm({ userId: '7' })
    await form.submit()
    expect(lastPutBody()).not.toHaveProperty('password')
  })

  it('sends the new password', async () => {
    const form = vm({ userId: '7' })
    form.password = 'Nova-1234'
    form.passwordConfirmation = 'Nova-1234'
    await form.submit()
    expect(lastPutBody().password).toBe('Nova-1234')
  })

  it('refuses a password that is too short or not repeated the same', async () => {
    const form = vm({ userId: '7' })
    form.password = 'abc'
    form.passwordConfirmation = 'abc'
    await form.submit()
    form.password = 'Nova-1234'
    form.passwordConfirmation = 'Nova-12345'
    await form.submit()
    expect(put).not.toHaveBeenCalled()
    expect(form.$buefy.toast.open).toHaveBeenCalledTimes(2)
    expect(form.$router.push).not.toHaveBeenCalled()
    expect(form.submitting).toBe(false)
  })
})
