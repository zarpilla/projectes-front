// issues/159: the supporters' logos («Amb el suport de», login page and side
// menu) could only be changed from the Strapi admin, and a trashed logo still
// showed. Administració › Logos adds, reorders, links and trashes them.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { sortLogos, shownLogos, nextLogoOrder, moveLogo, logosForDisplay } from '@/domain/logos'

const LOGOS = [
  { id: 1, order: 20, url: 'https://a.cat', logo: { id: 11, url: '/uploads/a.png' } },
  { id: 2, order: 10, url: null, logo: { id: 12, url: '/uploads/b.png' } },
  { id: 3, order: 30, trashed: true, logo: { id: 13, url: '/uploads/c.png' } },
  { id: 4, order: 40, logo: { id: 14, url: '/uploads/d.png' } }
]

let logos
const get = vi.fn(async () => ({ data: structuredClone(logos) }))
const post = vi.fn(async url => ({ data: url === 'upload' ? [{ id: 99, url: '/uploads/new.png' }] : { id: 5 } }))
const put = vi.fn(async () => ({ data: {} }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))
import AdminLogos from '@/views/AdminLogos.vue'
import menu from '@/service/menu'
import router from '@/router'

describe('logos (issues/159)', () => {
  it('shows the logos not trashed, by order, and adds a new one at the end', () => {
    expect(sortLogos(LOGOS).map(l => l.id)).toEqual([2, 1, 3, 4])
    expect(shownLogos(LOGOS).map(l => l.id)).toEqual([2, 1, 4])
    expect(nextLogoOrder(LOGOS)).toBe(50)
    expect(nextLogoOrder([])).toBe(10)
  })

  it('moves a logo and numbers the shown ones again, saving only the changes', () => {
    expect(moveLogo(LOGOS, 4, -1)).toEqual([{ id: 4, order: 20 }, { id: 1, order: 30 }])
    expect(moveLogo(LOGOS, 2, 1)).toEqual([{ id: 1, order: 10 }, { id: 2, order: 20 }, { id: 4, order: 30 }])
    expect(moveLogo(LOGOS, 2, -1)).toEqual([])
    expect(moveLogo(LOGOS, 4, 1)).toEqual([])
  })

  it('draws the shown logos with their image and their link', () => {
    expect(logosForDisplay(LOGOS, 'https://api.test')).toEqual([
      expect.objectContaining({ id: 2, src: 'https://api.test/uploads/b.png', href: null }),
      expect.objectContaining({ id: 1, src: 'https://api.test/uploads/a.png', href: 'https://a.cat' }),
      expect.objectContaining({ id: 4, src: 'https://api.test/uploads/d.png' })
    ])
  })

  it('is in the Administració menu, for admins', () => {
    const i = menu.indexOf('Administració')
    expect(menu[i + 1].find(m => m.to === '/administracio/logos')).toMatchObject({ label: 'Logos', permission: 'admin' })
    expect(router.resolve('/administracio/logos').name).toBe('admin.logos')
    expect(router.resolve('/administracio/form-submissions').name).toBe('admin.form-submissions')
  })
})

describe('Administració › Logos', () => {
  let confirm
  const mountIt = async () => {
    confirm = vi.fn(o => o.onConfirm())
    const w = mount(AdminLogos, {
      global: {
        plugins: [createPinia(), Buefy],
        mocks: { $buefy: { dialog: { confirm }, snackbar: { open: vi.fn() }, toast: { open: vi.fn() } } },
        stubs: { 'title-bar': true }
      }
    })
    await flushPromises()
    return w
  }

  beforeEach(() => {
    logos = structuredClone(LOGOS)
    get.mockClear(); post.mockClear(); put.mockClear()
  })

  it('lists the shown logos in order and the trashed ones apart', async () => {
    const w = await mountIt()
    expect(w.findAll('[data-test="logo-row"]')).toHaveLength(3)
    expect(w.findAll('[data-test="logo-row"] img').map(i => i.attributes('src'))[0]).toMatch(/b\.png$/)
    expect(w.findAll('[data-test="trashed-row"]')).toHaveLength(1)
  })

  it('uploads an image and adds it at the end', async () => {
    const w = await mountIt()
    const file = new File(['x'], 'nou.png', { type: 'image/png' })
    await w.vm.add(file)
    await flushPromises()
    expect(post).toHaveBeenNthCalledWith(1, 'upload', expect.any(FormData))
    expect(post).toHaveBeenNthCalledWith(2, 'logos', { logo: 99, order: 50, trashed: false })
  })

  it('moves, links, trashes and brings back a logo', async () => {
    const w = await mountIt()
    await w.findAll('[data-test="logo-row"]')[2].find('button[aria-label="Puja"]').trigger('click')
    await flushPromises()
    expect(put.mock.calls).toEqual([['logos/4', { order: 20 }], ['logos/1', { order: 30 }]])

    put.mockClear()
    w.vm.urls[2] = ' https://b.cat '
    await w.vm.saveUrl(logos[1])
    expect(put).toHaveBeenCalledWith('logos/2', { url: 'https://b.cat' })

    put.mockClear()
    await w.vm.trash(logos[0])
    await flushPromises()
    expect(confirm).toHaveBeenCalled()
    expect(put).toHaveBeenCalledWith('logos/1', { trashed: true })

    put.mockClear()
    await w.vm.restore(logos[2])
    expect(put).toHaveBeenCalledWith('logos/3', { trashed: false, order: 50 })
  })
})
