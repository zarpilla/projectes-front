// issues/087: some users have permission rows without a value. The list
// export showed them as «projects, , hours» with raw keys, and the user form
// loaded the empty ones and saved them back.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { permissionCodes, permissionLabel } from '@/domain/permissions'

const user = { id: 7, username: 'anna', email: 'a@x.coop', permissions: [{ permission: 'projects' }, { permission: null }, { permission: 'hours' }] }
const get = vi.fn(async url => ({ data: url.includes('roles') ? { roles: [] } : url.startsWith('/users?') ? [user] : user }))
const put = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import AdminUserForm from '@/components/AdminUserForm.vue'
import AdminUserList from '@/components/AdminUserList.vue'

const global = { plugins: [createPinia(), Buefy], mocks: { $router: { push: vi.fn() } }, stubs: { 'router-link': true, 'download-excel': true } }

describe('user permissions without a value (issues/087)', () => {
  it('drops them when reading', () => {
    expect(permissionCodes(user.permissions)).toEqual(['projects', 'hours'])
    expect(permissionCodes(['admin', null, ''])).toEqual(['admin'])
    expect(permissionLabel('orders_admin')).toBe('Logística (oficina)')
  })

  it('the user form does not save them back', async () => {
    const w = mount(AdminUserForm, { props: { userId: '7' }, global })
    await flushPromises()
    await w.vm.submit()
    await flushPromises()
    expect(put.mock.calls.at(-1)[1].permissions).toEqual([{ permission: 'projects' }, { permission: 'hours' }])
  })

  it('the export names the permissions without empty items', async () => {
    const w = mount(AdminUserList, { global })
    await flushPromises()
    const [row] = await w.vm.fetchExcel()
    expect(row.permissions).toBe('Projectes, Hores')
  })
})
