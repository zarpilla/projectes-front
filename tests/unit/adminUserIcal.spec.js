// issues/159: a person's calendar (iCal), imported as dedicated hours, could
// only be set in the Strapi admin; the user form now edits it.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async url => ({ data: url.includes('roles') ? { roles: [{ id: 1, type: 'authenticated', name: 'Authenticated' }] } : { id: 7, username: 'anna', email: 'a@x.coop', ical: 'https://cal.example.org/anna.ics', permissions: [] } }))
const put = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import AdminUserForm from '@/components/AdminUserForm.vue'

describe('AdminUserForm iCal (issues/159)', () => {
  it('shows the calendar and sends it back', async () => {
    const w = mount(AdminUserForm, {
      props: { userId: '7' },
      global: { plugins: [createPinia(), Buefy], mocks: { $router: { push: vi.fn() } }, stubs: { 'router-link': true } }
    })
    await flushPromises()
    expect(w.text()).toContain('Calendari personal (iCal)')
    expect(w.vm.form.ical).toBe('https://cal.example.org/anna.ics')
    w.vm.form.ical = ''
    await w.vm.submit()
    await flushPromises()
    expect(put.mock.calls.at(-1)[1].ical).toBeNull()
  })
})
