// issues/107: «Factures» (logistics, a member's own invoices) was a blank page
// with an error toast for a user without a linked member contact.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async url => ({
  data: url.startsWith('years') ? [{ year: 2026 }] : url === 'users/me' ? { id: 3 } : []
}))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import EmittedInvoicesProvider from '@/views/EmittedInvoicesProvider.vue'

describe('Factures without a linked contact (issues/107)', () => {
  it('explains it instead of a blank page', async () => {
    const open = vi.fn()
    const w = mount(EmittedInvoicesProvider, {
      global: { plugins: [createPinia(), Buefy], mocks: { $buefy: { snackbar: { open } } }, stubs: { 'title-bar': true, 'emitted-invoices-table': true } }
    })
    await flushPromises()
    expect(w.text()).toContain('no té cap contacte de sòcia vinculat')
    expect(open).not.toHaveBeenCalled()
    expect(w.find('emitted-invoices-table-stub').exists()).toBe(false)
  })
})
