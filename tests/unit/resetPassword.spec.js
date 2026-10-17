// issues/079: «Clau nova» enabled its button with 3 characters while the
// backend asks for 6, so a short password failed as «l'enllaç pot haver caducat».
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ post: vi.fn() }) }))
import ResetPassword from '@/views/ResetPassword.vue'

const valid = (password, confirmPassword = password) => ResetPassword.computed.valid.call({ password, confirmPassword })

describe('ResetPassword (issues/079)', () => {
  it('asks for at least 6 characters, repeated', () => {
    expect(valid('abc')).toBe(false)
    expect(valid('abcde')).toBe(false)
    expect(valid('abcdef')).toBe(true)
    expect(valid('abcdef', 'abcdeg')).toBe(false)
  })
})
