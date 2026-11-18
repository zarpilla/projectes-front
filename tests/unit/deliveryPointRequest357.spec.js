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
import { pointRequestError, isOfficeUser, requestState, slotsFromSchedule, pointFromRequest } from '@/domain/deliveryPointRequest'
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
    expect(w.find('[data-test="request-approve"]').exists()).toBe(false)
  })

  it('the office sees the member and approves or rejects it, with a message (issues/357, seguiment)', async () => {
    me = { id: 2, permissions: [{ permission: 'orders_admin' }] }
    const { w } = await mountView()
    expect(w.find('[data-test="requests-table"]').text()).toContain('Formatges Serra')
    expect(w.find('[data-test="request-approve"]').exists()).toBe(true)
    expect(w.find('[data-test="request-reject"]').exists()).toBe(true)
    expect(get).toHaveBeenCalledWith('delivery-point-requests', { params: expect.objectContaining({ _archived: 0, 'populate[1]': 'contact' }) })
    const prompt = vi.spyOn(w.vm.$buefy.dialog, 'prompt').mockImplementation(o => o.onConfirm(' Hi passem els dimarts '))
    await w.vm.decide(w.vm.requests[0], 'approved')
    await flushPromises()
    expect(prompt.mock.calls[0][0].confirmText).toBe('Aprova')
    expect(put).toHaveBeenCalledWith('delivery-point-requests/1', { data: { status: 'approved', answer: 'Hi passem els dimarts' } })
    expect(w.vm.requests[0]).toMatchObject({ status: 'approved', answered: true, answer: 'Hi passem els dimarts' })
    expect(w.vm.pendingCount).toBe(0)
    await w.vm.$nextTick()
    expect(w.find('[data-test="request-state"]').text()).toBe('Aprovada')
    expect(w.find('[data-test="request-create-point"]').exists()).toBe(true)
    expect(w.find('[data-test="request-approve"]').exists()).toBe(false)
  })

  it('back to pending, no prompt', async () => {
    me = { id: 2, permissions: [{ permission: 'orders_admin' }] }
    list = [{ ...REQUEST, answered: true, status: 'rejected', answer: 'No hi arribem' }]
    const { w } = await mountView()
    const prompt = vi.spyOn(w.vm.$buefy.dialog, 'prompt')
    await w.vm.decide(w.vm.requests[0], null)
    expect(prompt).not.toHaveBeenCalled()
    expect(put).toHaveBeenCalledWith('delivery-point-requests/1', { data: { status: null, answer: '' } })
    expect(w.vm.requests[0]).toMatchObject({ status: null, answered: false, answer: null })
  })

  it('archives a decided one out of the list; the archived ones are listed apart', async () => {
    me = { id: 2, permissions: [{ permission: 'orders_admin' }] }
    list = [{ ...REQUEST, answered: true, status: 'rejected' }]
    const { w } = await mountView()
    await w.vm.setArchived(w.vm.requests[0], true)
    expect(put).toHaveBeenCalledWith('delivery-point-requests/1', { data: { archived: true } })
    expect(w.vm.requests).toEqual([])
    get.mockClear()
    w.vm.showArchived = true
    await w.vm.load()
    expect(get).toHaveBeenCalledWith('delivery-point-requests', { params: expect.objectContaining({ _archived: 1 }) })
  })

  it('an approved one opens the point form filled from it; once created, links to the point', async () => {
    me = { id: 2, permissions: [{ permission: 'orders_admin' }] }
    list = [{ ...REQUEST, answered: true, status: 'approved' }, { ...REQUEST, id: 2, answered: true, status: 'approved', contact: { id: 40, trade_name: 'Bar Nou' } }]
    const { w } = await mountView()
    const push = vi.spyOn(w.vm.$router, 'push')
    w.vm.createPoint(w.vm.requests[0])
    expect(push).toHaveBeenCalledWith({ path: '/punt-entrega/0', query: { consulta: 1 } })
    expect(w.findAll('[data-test="request-create-point"]').length).toBe(1)
    expect(w.find('[data-test="request-point"]').attributes('href')).toBe('/punt-entrega/40')
  })

  it('a member sees the decision and the message, no buttons', async () => {
    list = [{ ...REQUEST, answered: true, status: 'rejected', answer: 'No hi arribem' }]
    const { w } = await mountView()
    expect(w.find('[data-test="request-state"]').text()).toBe('Rebutjada')
    expect(w.text()).toContain('No hi arribem')
    expect(w.find('[data-test="request-archive"]').exists()).toBe(false)
    expect(get).toHaveBeenCalledWith('delivery-point-requests', { params: expect.not.objectContaining({ _archived: expect.anything() }) })
  })

  it('who is the office', () => {
    expect(isOfficeUser(['orders'])).toBe(false)
    expect(isOfficeUser(['orders_delivery'])).toBe(false)
    expect(isOfficeUser(['orders_admin'])).toBe(true)
    expect(isOfficeUser(['admin'])).toBe(true)
  })
})

describe('the decision (issues/357, seguiment)', () => {
  it('pending, approved, rejected; answered before the decisions stays «Resposta»', () => {
    expect(requestState({ answered: false }).text).toBe('Pendent')
    expect(requestState({ answered: true, status: 'approved' }).text).toBe('Aprovada')
    expect(requestState({ answered: true, status: 'rejected' }).text).toBe('Rebutjada')
    expect(requestState({ answered: true, status: null }).text).toBe('Resposta')
  })
})

describe('the point from an approved request (issues/357, seguiment)', () => {
  it('reads the slots the schedule names', () => {
    expect(slotsFromSchedule('De dilluns a divendres\nde 8 a 20 h')).toEqual({ time_slot_1_ini: 8, time_slot_1_end: 20, time_slot_2_ini: null, time_slot_2_end: null })
    expect(slotsFromSchedule('16-19 i 8:30h – 13.30h')).toEqual({ time_slot_1_ini: 8.5, time_slot_1_end: 13.5, time_slot_2_ini: 16, time_slot_2_end: 19 })
    expect(slotsFromSchedule('de 9 fins a les 14')).toMatchObject({ time_slot_1_ini: 9, time_slot_1_end: 14 })
    expect(slotsFromSchedule('Matins')).toEqual({ time_slot_1_ini: null, time_slot_1_end: null, time_slot_2_ini: null, time_slot_2_end: null })
    expect(slotsFromSchedule('20 a 8')).toMatchObject({ time_slot_1_ini: null })
    expect(slotsFromSchedule('8:10-14')).toMatchObject({ time_slot_1_ini: null })
    // overlapping second range: only the first
    expect(slotsFromSchedule('8-14, 10-12')).toMatchObject({ time_slot_1_ini: 8, time_slot_1_end: 14, time_slot_2_ini: null })
  })

  it('fills the form: owner, names, address, the town on the list and its CP, notes; schedule and weight to the drivers', () => {
    const point = pointFromRequest(
      { ...REQUEST, city: 'vic', notes: 'Porta lateral', schedule: 'de 8 a 14 h' },
      { cities: [{ id: 1, name: 'Manlleu' }, { id: 2, name: 'Vic' }], townPostcodes: { vic: '08500' } }
    )
    expect(point).toEqual({
      owner: 5, trade_name: 'Bar Nou', name: 'Bar Nou', address: 'C/ Major 1', city: 'Vic', postcode: '08500', notes: 'Porta lateral',
      notes_delivery: 'Horari indicat a la consulta: de 8 a 14 h\nPes estimat de la comanda: 15 kg',
      time_slot_1_ini: 8, time_slot_1_end: 14, time_slot_2_ini: null, time_slot_2_end: null
    })
    const unknownTown = pointFromRequest({ ...REQUEST, city: 'Olot', trade_name: '' }, { cities: [{ name: 'Vic' }] })
    expect(unknownTown).toMatchObject({ city: null, postcode: null, trade_name: null })
  })
})
