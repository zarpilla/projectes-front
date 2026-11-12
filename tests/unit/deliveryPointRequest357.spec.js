// issues/357 (Joel, la Diligència): a tab next to the Simulador,
// «Consulta i autorització nou punt d'entrega», where a member asks for a
// delivery point the service doesn't cover yet. Only Població, Adreça and
// Horari (free text) are required. The office gets it by e-mail; the list keeps
// who asked, when, and a switch «Resposta» the office sets.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

let me = { id: 5, permissions: [{ permission: 'orders' }] }
let list = []
const get = vi.fn(async (url) => (url === 'users/me' ? { data: me } : url === 'delivery-point-requests' ? { data: list } : { data: [] }))
const post = vi.fn(async (url, body) => ({ data: { id: 30, ...body.data } }))
const put = vi.fn(async (url, body) => ({ data: { id: 1, ...body.data, answered_date: body.data.answered ? '2026-11-12T10:00:00.000Z' : null } }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put, delete: vi.fn() }) }))

import DeliveryPointRequest from '@/views/DeliveryPointRequest.vue'
import { pointRequestError, isOfficeUser } from '@/domain/deliveryPointRequest'
import { TABS } from '@/components/RoutesTabs.vue'
import router from '@/router'

const REQUEST = {
  id: 1, createdAt: '2026-11-10T09:30:00.000Z', trade_name: 'Bar Nou', city: 'Vic', address: 'C/ Major 1',
  schedule: 'De dilluns a divendres\nde 8 a 20 h', estimated_weight: '15 kg', notes: '', answered: false,
  user: { id: 5, username: 'formatges', fullname: 'Formatges Serra' }
}

async function mountView () {
  const r = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)', component: { template: '<div />' } }] })
  await r.push('/consulta-punt-entrega')
  const w = mount(DeliveryPointRequest, {
    global: { plugins: [createPinia(), Buefy, r], stubs: { 'title-bar': true } }
  })
  await flushPromises()
  const snackbar = vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
  return { w, snackbar }
}

beforeEach(() => {
  me = { id: 5, permissions: [{ permission: 'orders' }] }
  list = [REQUEST]
  get.mockClear(); post.mockClear(); put.mockClear()
})

describe('the tab (issues/357)', () => {
  it('sits right after the Simulador, for everyone', () => {
    const i = TABS.findIndex(t => t.to === '/simulador-logistic')
    expect(TABS[i + 1]).toEqual({ to: '/consulta-punt-entrega', label: "Consulta i autorització nou punt d'entrega" })
    expect(router.resolve('/consulta-punt-entrega').name).toBe('delivery-point.request')
  })
})

describe('the form (issues/357)', () => {
  it('requires only the town, the address and the schedule', () => {
    expect(pointRequestError({ trade_name: 'Bar' })).toBe("Falta la població, l'adreça i l'horari.")
    expect(pointRequestError({ city: 'Vic', address: ' ', schedule: 'x' })).toBe("Falta l'adreça.")
    expect(pointRequestError({ city: 'Vic', address: 'C/ Major 1', schedule: 'Matins' })).toBeNull()
  })

  it("doesn't send an incomplete request", async () => {
    const { w, snackbar } = await mountView()
    w.vm.form.city = 'Vic'
    await w.vm.send()
    expect(post).not.toHaveBeenCalled()
    expect(snackbar.mock.calls[0][0].message).toBe("Falta l'adreça i l'horari.")
  })

  it('sends it, empties the form and reloads the list', async () => {
    const { w, snackbar } = await mountView()
    Object.assign(w.vm.form, { trade_name: 'Bar Nou', city: 'Vic', address: 'C/ Major 1', schedule: 'Matins', estimated_weight: '15 kg', notes: 'Porta lateral' })
    get.mockClear()
    await w.vm.send()
    expect(post).toHaveBeenCalledWith('delivery-point-requests', {
      data: { trade_name: 'Bar Nou', city: 'Vic', address: 'C/ Major 1', schedule: 'Matins', estimated_weight: '15 kg', notes: 'Porta lateral' }
    })
    expect(snackbar.mock.calls[0][0].message).toMatch(/Consulta enviada/)
    expect(w.vm.form.city).toBe('')
    expect(get).toHaveBeenCalledWith('delivery-point-requests', expect.anything())
  })
})

describe('the list (issues/357)', () => {
  it('a member sees hers with the state, no member column and no switch', async () => {
    const { w } = await mountView()
    const table = w.find('[data-test="requests-table"]')
    expect(table.text()).toContain('Bar Nou')
    expect(table.text()).toContain('C/ Major 1 · Vic')
    expect(table.text()).toContain('Pendent')
    expect(table.text()).not.toContain('Formatges Serra')
    expect(w.find('[data-test="request-answered"]').exists()).toBe(false)
  })

  it('the office sees the member and marks it answered', async () => {
    me = { id: 2, permissions: [{ permission: 'orders_admin' }] }
    const { w } = await mountView()
    expect(w.find('[data-test="requests-table"]').text()).toContain('Formatges Serra')
    expect(w.find('[data-test="request-answered"]').exists()).toBe(true)
    await w.vm.setAnswered(w.vm.requests[0], true)
    expect(put).toHaveBeenCalledWith('delivery-point-requests/1', { data: { answered: true } })
    expect(w.vm.requests[0]).toMatchObject({ answered: true, answered_date: '2026-11-12T10:00:00.000Z' })
    expect(w.vm.pendingCount).toBe(0)
  })

  it('who is the office', () => {
    expect(isOfficeUser(['orders'])).toBe(false)
    expect(isOfficeUser(['orders_delivery'])).toBe(false)
    expect(isOfficeUser(['orders_admin'])).toBe(true)
    expect(isOfficeUser(['admin'])).toBe(true)
  })
})
