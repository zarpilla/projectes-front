// issues/079: «Clau nova» enabled its button with 3 characters while the
// backend asks for 6, so a short password failed as «l'enllaç pot haver caducat».
// 2026-10-31: the minimum is now 10 characters, and a password the API refuses
// shows its reason instead of the expired link message.
import { describe, it, expect, vi } from 'vitest'
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ post }) }))
import ResetPassword from '@/views/ResetPassword.vue'

const valid = (password, confirmPassword = password) => ResetPassword.computed.valid.call({ password, confirmPassword })

function vm () {
  const ctx = {
    $route: { query: { code: 'abc' } },
    $router: { push: vi.fn() },
    $buefy: { snackbar: { open: vi.fn() } },
    ...ResetPassword.data.call({})
  }
  ctx.resetPassword = ResetPassword.methods.resetPassword.bind(ctx)
  return ctx
}

describe('ResetPassword (issues/079)', () => {
  it('asks for at least 10 characters, repeated', () => {
    expect(valid('abc')).toBe(false)
    expect(valid('abcdefghi')).toBe(false)
    expect(valid('abcdefghij')).toBe(true)
    expect(valid('abcdefghij', 'abcdefghik')).toBe(false)
  })

  it('shows the reason the API refuses a password', async () => {
    post.mockRejectedValueOnce({ response: { data: { message: 'Aquesta clau és massa comuna: tria-la menys previsible' } } })
    const page = vm()
    await page.resetPassword()
    expect(page.error).toContain('massa comuna')
  })

  it('a wrong or used code still says the link may have expired', async () => {
    post.mockRejectedValueOnce({ response: { data: { message: 'Incorrect code provided' } } })
    const page = vm()
    await page.resetPassword()
    expect(page.error).toContain('caducat')
  })
})
