// Password minimum (2026-10-31): 10 characters for every tenant (the API checks
// the rest). The admin user screen recommends the e-mail link over setting
// someone's password, a new user can get the link instead of a password, and a
// login with a weak password gets a notice once.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const put = vi.fn().mockResolvedValue({ data: {} })
const post = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))

import {
  passwordProblem,
  apiMessage,
  randomPassword,
  rememberWeakPassword,
  takeWeakPasswordNotice
} from '@/service/passwordPolicy'
import AdminUserForm from '@/components/AdminUserForm.vue'

describe('passwordPolicy helpers', () => {
  it('asks for 10 characters and the same confirmation', () => {
    expect(passwordProblem('')).toContain('Cal')
    expect(passwordProblem('Curta-123')).toContain('10 caràcters')
    expect(passwordProblem('cavall bateria grapa', 'cavall bateria')).toContain('no coincideixen')
    expect(passwordProblem('cavall bateria grapa', 'cavall bateria grapa')).toBeNull()
    expect(passwordProblem('cavall bateria grapa')).toBeNull()
  })

  it('refuses more than 72 bytes (bcrypt ignores the rest)', () => {
    expect(passwordProblem('ñ'.repeat(37))).toContain('massa llarga')
  })

  it('reads the API message, or falls back', () => {
    expect(apiMessage({ response: { data: { message: 'Aquesta clau és massa comuna' } } }, 'x')).toBe('Aquesta clau és massa comuna')
    expect(apiMessage({ message: 'Network Error' }, 'x')).toBe('x')
  })

  it('makes long random passwords that meet the minimum', () => {
    const a = randomPassword()
    expect(passwordProblem(a)).toBeNull()
    expect(a.length).toBeGreaterThanOrEqual(20)
    expect(randomPassword()).not.toBe(a)
  })

  it('keeps the weak password notice for one time only', () => {
    rememberWeakPassword(true)
    expect(takeWeakPasswordNotice()).toBe(true)
    expect(takeWeakPasswordNotice()).toBe(false)
    rememberWeakPassword(true)
    rememberWeakPassword(false)
    expect(takeWeakPasswordNotice()).toBe(false)
  })
})

describe('AdminUserForm: password by link', () => {
  let dialog

  function vm (props = {}) {
    dialog = { confirm: vi.fn(), prompt: vi.fn() }
    const ctx = {
      ...props,
      $buefy: { toast: { open: vi.fn() }, dialog },
      $router: { push: vi.fn() }
    }
    Object.assign(ctx, AdminUserForm.data.call(ctx))
    for (const [name, fn] of Object.entries(AdminUserForm.methods)) ctx[name] = fn.bind(ctx)
    ctx.roles = [{ id: 1, type: 'authenticated' }]
    return ctx
  }

  beforeEach(() => {
    post.mockClear()
    put.mockClear()
  })

  it('sends the reset e-mail of an existing user', async () => {
    const form = vm({ userId: '7' })
    form.form.email = 'maria@example.org'
    await form.sendLink()
    expect(post).toHaveBeenCalledWith('auth/forgot-password', { email: 'maria@example.org' })
    expect(form.linkSent).toBe(true)
  })

  it('a new user: recommends the link, creates her with a random password and sends it', async () => {
    const form = vm()
    form.form.email = 'joan@example.org'
    form.form.username = 'joan'
    await form.submit()
    expect(dialog.confirm).toHaveBeenCalledTimes(1)
    const options = dialog.confirm.mock.calls[0][0]
    expect(options.confirmText).toContain('enllaç')

    await options.onConfirm()
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/users')
    expect(passwordProblem(body.password)).toBeNull()
    expect(post).toHaveBeenCalledWith('auth/forgot-password', { email: 'joan@example.org' })
    expect(form.$router.push).toHaveBeenCalledWith('/administracio/usuaries')
  })

  it('a new user with the password set by the admin: refuses a short one', async () => {
    const form = vm()
    form.form.email = 'joan@example.org'
    await form.submit()
    dialog.confirm.mock.calls[0][0].onCancel()
    const prompt = dialog.prompt.mock.calls[0][0]
    expect(prompt.inputAttrs.minlength).toBe(10)

    await prompt.onConfirm('curta')
    expect(post).not.toHaveBeenCalled()

    await prompt.onConfirm('cavall bateria grapa')
    expect(post.mock.calls[0][1].password).toBe('cavall bateria grapa')
    // no link when the admin set the password
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('shows the API reason when a password is refused', async () => {
    const form = vm({ userId: '7' })
    put.mockRejectedValueOnce({ message: 'Request failed', response: { data: { message: 'Aquesta clau és massa comuna' } } })
    form.password = 'barcelona2026'
    form.passwordConfirmation = 'barcelona2026'
    await form.submit()
    expect(form.$buefy.toast.open.mock.calls[0][0].message).toContain('massa comuna')
    expect(form.$router.push).not.toHaveBeenCalled()
  })
})
