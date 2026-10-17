// issues/089: «Decimal Excel» stayed in the user form after the exports
// stopped reading it (issues/032); it is gone from the form and the payload.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async url => ({ data: url.includes('roles') ? { roles: [{ id: 1, type: 'authenticated', name: 'Authenticated' }] } : { id: 7, username: 'anna', email: 'a@x.coop', excel_decimal: ',', permissions: [] } }))
const put = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import AdminUserForm from '@/components/AdminUserForm.vue'

describe('AdminUserForm without «Decimal Excel» (issues/089)', () => {
  it('neither shows nor sends excel_decimal', async () => {
    const w = mount(AdminUserForm, {
      props: { userId: '7' },
      global: { plugins: [createPinia(), Buefy], mocks: { $router: { push: vi.fn() } }, stubs: { 'router-link': true } }
    })
    await flushPromises()
    expect(w.text()).not.toContain('Decimal Excel')
    await w.vm.submit()
    await flushPromises()
    const [, body] = put.mock.calls.at(-1)
    expect(body).not.toHaveProperty('excel_decimal')
  })
})
