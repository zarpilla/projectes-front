// «Buida la memòria cau» in Configuració general (issues/307): what the
// server's read cache keeps, and a way to empty it after a change made
// straight in the database (POST read-cache/clear, admins only).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/service/index', () => ({
  default: () => ({ get, post })
}))

import ReadCacheCard from '@/components/ReadCacheCard.vue'

const stats = over => ({ on: true, entries: 42, bytes: 12 * 1048576, maxBytes: 64 * 1048576, hits: 75, misses: 25, ...over })

const mountCard = () => mount(ReadCacheCard, { global: { plugins: [Buefy] } })

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe('ReadCacheCard', () => {
  it('shows what the cache keeps', async () => {
    get.mockResolvedValue({ data: stats() })
    const w = mountCard()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('read-cache/stats')
    const text = w.text()
    expect(text).toContain('Activa')
    expect(text).toContain('42')
    expect(text).toContain('12 MB de 64 MB')
    expect(text).toContain('75 % de 100')
  })

  it('says when the cache is off or can\'t be read', async () => {
    get.mockResolvedValueOnce({ data: stats({ on: false }) })
    const off = mountCard()
    await flushPromises()
    expect(off.text()).toContain('Desactivada')

    get.mockRejectedValueOnce({ message: 'Forbidden', response: { data: { message: 'Forbidden' } } })
    const failed = mountCard()
    await flushPromises()
    expect(failed.text()).toContain("No s'ha pogut consultar: Forbidden")
  })

  it('empties it only after confirming, then reads it again', async () => {
    get.mockResolvedValue({ data: stats() })
    post.mockResolvedValue({ data: { cleared: 42 } })
    const w = mountCard()
    await flushPromises()
    const confirm = vi.spyOn(w.vm.$buefy.dialog, 'confirm')
    const snackbar = vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})

    await w.find('.cache-clear').trigger('click')
    expect(confirm).toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()

    get.mockResolvedValue({ data: stats({ entries: 0, bytes: 0 }) })
    confirm.mock.calls[0][0].onConfirm()
    await flushPromises()
    expect(post).toHaveBeenCalledWith('read-cache/clear')
    expect(snackbar.mock.calls[0][0].message).toBe('Memòria cau buidada (42 respostes)')
    expect(w.text()).toContain('0 MB de 64 MB')
  })
})
