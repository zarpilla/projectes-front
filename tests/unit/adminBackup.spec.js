// «Còpia de seguretat» (2026-10-24): Administració lets the admins download
// last night's dump of the entity's database (GET backup/latest[/download]).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import AdminBackup from '@/views/AdminBackup.vue'
import menu from '@/service/menu'
import router from '@/router'

const toast = vi.fn()
const mountIt = async () => {
  const w = mount(AdminBackup, {
    global: {
      plugins: [createPinia(), Buefy],
      mocks: { $buefy: { toast: { open: toast } } },
      stubs: { 'title-bar': true }
    }
  })
  await flushPromises()
  return w
}

const INFO = { available: true, createdAt: '2026-10-24T01:05:00.000Z', bytes: 4466111, filename: 'diligencia_v5-20261024.sql.gz' }

beforeEach(() => {
  get.mockReset()
  toast.mockReset()
})

describe('AdminBackup', () => {
  it('is in the Administració menu, for admins', () => {
    const i = menu.indexOf('Administració')
    expect(menu[i + 1].find(m => m.to === '/administracio/backup')).toMatchObject({ label: 'Còpia de seguretat', permission: 'admin' })
    const route = router.resolve('/administracio/backup')
    expect(route.name).toBe('admin.backup')
    expect(route.meta.requiresPermission).toBe('admin')
  })

  it('shows when the copy was made and its size', async () => {
    get.mockResolvedValue({ data: INFO })
    const w = await mountIt()
    expect(get).toHaveBeenCalledWith('backup/latest')
    const text = w.find('[data-test="backup-facts"]').text()
    expect(text).toMatch(/24\/10\/2026 a les \d\d:05/)
    expect(text).toContain('4,3 MB')
    expect(text).toContain('diligencia_v5-20261024.sql.gz')
    expect(w.find('[data-test="backup-download"]').attributes('disabled')).toBeUndefined()
  })

  it('says there is no copy yet and disables the button', async () => {
    get.mockResolvedValue({ data: { available: false } })
    const w = await mountIt()
    expect(w.find('[data-test="backup-none"]').exists()).toBe(true)
    expect(w.find('[data-test="backup-download"]').attributes('disabled')).toBeDefined()
  })

  it('says the entity has no copies when the host gives it none (e.g. demo)', async () => {
    get.mockResolvedValue({ data: { enabled: false, available: false } })
    const w = await mountIt()
    expect(w.find('[data-test="backup-disabled"]').text()).toContain('no té còpies')
    expect(w.find('[data-test="backup-none"]').exists()).toBe(false)
    expect(w.find('[data-test="backup-download"]').exists()).toBe(false)
  })

  it('shows the error when it cannot ask', async () => {
    get.mockRejectedValue({ response: { data: { error: { message: 'Forbidden' } } } })
    const w = await mountIt()
    expect(w.find('[data-test="backup-error"]').text()).toContain('Forbidden')
  })

  it('downloads the file with its name', async () => {
    get.mockResolvedValueOnce({ data: INFO })
    const w = await mountIt()
    const blob = new Blob(['dump'])
    get.mockResolvedValueOnce({ data: blob })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('diligencia_v5-20261024.sql.gz')
      expect(this.href).toBe('blob:x')
    })
    await w.find('[data-test="backup-download"]').trigger('click')
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith('backup/latest/download', { responseType: 'blob' })
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(toast).not.toHaveBeenCalled()
    click.mockRestore()
  })
})
