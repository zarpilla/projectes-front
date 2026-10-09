// issues/021 — "He oblidat la clau de pas" always failed: the form posted
// { email, url } and Strapi 5 refuses unknown keys (400 "unspecified keys: url").
// The reset link now comes from the backend's settings, so only the email is sent.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const post = vi.fn().mockResolvedValue({ data: { ok: true } })
vi.mock('@/service/index', () => ({ default: () => ({ post }) }))

import ForgottenPassword from '@/views/ForgottenPassword.vue'

describe('ForgottenPassword', () => {
  it('posts only the email to auth/forgot-password', async () => {
    const wrapper = mount(ForgottenPassword, {
      global: { plugins: [Buefy], stubs: { 'router-link': true } }
    })
    await wrapper.find('input').setValue('persona@exemple.coop')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('auth/forgot-password', { email: 'persona@exemple.coop' })
  })
})
