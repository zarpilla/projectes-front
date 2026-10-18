// Found while writing the manual (2026-10): on «Rutes i punts › Rutes»,
// switching a route off asks for confirmation; cancelling left the switch drawn
// off (b-switch keeps its own state) until a reload, though the route was still
// active.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const put = vi.fn(async () => ({ data: {} }))
const get = vi.fn(async url => ({
  data: url.startsWith('routes') ? [{ id: 1, name: 'Girona', order: 1, active: true, monday: true }] : []
}))
vi.mock('@/service/index', () => ({ default: () => ({ get, put }) }))
import Routes from '@/views/Routes.vue'

describe('route active switch', () => {
  it('goes back on when the deactivation is cancelled', async () => {
    let options
    const confirm = vi.fn(o => { options = o })
    const w = mount(Routes, {
      global: {
        plugins: [createPinia(), Buefy],
        mocks: { $buefy: { dialog: { confirm }, snackbar: { open: vi.fn() } } },
        stubs: { 'title-bar': true, 'routes-tabs': true, 'b-modal': true }
      }
    })
    await flushPromises()
    const input = () => w.find('tbody input[type="checkbox"]')
    expect(input().element.checked).toBe(true)

    await input().setValue(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(input().element.checked).toBe(false)

    options.onCancel()
    await flushPromises()
    expect(input().element.checked).toBe(true)
    expect(put).not.toHaveBeenCalled()
  })
})
