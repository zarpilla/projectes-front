// issues/249: a closed incidence only said «Aquesta incidència està tancada»;
// the API lets it be reopened since issues/226, but no screen offered it. The
// staff now get «Reobre», which sends state «open»; members don't.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const incidence = { id: 12, state: 'closed', description: 'Falten dues caixes', createdAt: '2026-10-18T09:00:00Z', closed_date: '2026-10-18T10:00:00Z', order: { id: 300, contact_trade_name: 'Can Pere', owner: 7 } }
let permission = 'orders_admin'
const put = vi.fn(async () => ({ data: {} }))
const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 3, permissions: [{ permission }] } }
  if (url === 'users') return { data: [] }
  if (url === 'incidences') return { data: [incidence] }
  if (url === 'incidences/12') return { data: { ...incidence, incidence_response: [] } }
  if (url.startsWith('incidences/count')) return { data: 1 }
  if (url === 'orders/300') return { data: { id: 300, status: 'delivered' } }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn(), delete: vi.fn() }) }))
import IncidencesTable from '@/components/IncidencesTable.vue'

async function openClosed () {
  Element.prototype.scrollIntoView = vi.fn()
  const wrapper = mount(IncidencesTable, {
    global: {
      plugins: [Buefy, createPinia()],
      stubs: { TitleBar: true, 'router-link': true, 'download-excel': true },
      mocks: { $route: { query: {} } }
    }
  })
  await flushPromises()
  await wrapper.find('.inc-cards .inc-card').trigger('click')
  await flushPromises()
  return wrapper
}

describe('Reopen a closed incidence (issues/249)', () => {
  beforeEach(() => { put.mockClear() })

  it('the staff reopen it', async () => {
    permission = 'orders_admin'
    const wrapper = await openClosed()
    const confirm = vi.spyOn(wrapper.vm.$buefy.dialog, 'confirm').mockImplementation(o => o.onConfirm())
    const button = wrapper.find('.closed-note .reopen')
    expect(button.exists()).toBe(true)
    await button.trigger('click')
    await flushPromises()
    expect(confirm.mock.calls[0][0].message).toBe('Vols reobrir aquesta incidència?')
    expect(put).toHaveBeenCalledWith('incidences/12', { state: 'open' })
  })

  it('members only see that it is closed', async () => {
    permission = 'orders'
    const wrapper = await openClosed()
    expect(wrapper.find('.closed-note').text()).toContain('Aquesta incidència està tancada.')
    expect(wrapper.find('.closed-note .reopen').exists()).toBe(false)
  })
})
