// issues/429 (Joel, la Diligència): grouped pickups (XXXXX-R). In Comandes a
// -R unfolds the orders it gathers, each with its pickup and delivery (date
// and route), editable inline with the pencil; the order number opens its card
// in a new tab. A pickup after its delivery is refused with a blocking notice
// whose order ids open in a new tab.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const ORDERS = [
  { id: 24874, status: 'processed', estimated_delivery_date: '2026-11-20', route: { id: 1, name: 'DC - BCN' }, collection_pickup_date: '2026-11-18', collection_pickup_route: { id: 25, name: 'DT - MARESME' }, contact: { trade_name: 'Linverd' } },
  { id: 24876, status: 'pending', estimated_delivery_date: '2026-11-19', route: { id: 2, name: 'DC - OSONA' }, collection_pickup_date: '2026-11-18', collection_pickup_route: { id: 25, name: 'DT - MARESME' }, contact: { trade_name: "L'Artiga" } },
  { id: 24890, status: 'cancelled', estimated_delivery_date: '2026-11-19', contact: { trade_name: 'Anul·lada' } }
]
let putError = null
const get = vi.fn(async () => ({ data: ORDERS }))
const put = vi.fn(async (url, data) => { if (putError) throw putError; return { data } })
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn(), delete: vi.fn() }) }))

import CollectionGroupRows from '@/components/CollectionGroupRows.vue'
import ModalPickupConflict from '@/components/ModalPickupConflict.vue'
import { conflictOrders, refusalMessage, groupedEditForm, groupedEditPayload, pickupAfterDelivery, movesPickup } from '@/domain/collectionGroup'

const routes = [{ id: 1, name: 'DC - BCN' }, { id: 2, name: 'DC - OSONA' }, { id: 25, name: 'DT - MARESME' }]
const refusal = (message, orders) => ({ response: { status: 400, data: { error: { status: 400, message, details: { orders } }, message } } })

function router () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/comanda/:id', name: 'orders.edit', component: { template: '<div />' } }
    ]
  })
}

async function mountGroup (canEdit = true) {
  const w = mount(CollectionGroupRows, {
    props: { collectionOrder: { id: 24875, is_collection_order: true }, routes, canEdit },
    global: { plugins: [createPinia(), Buefy, router()] }
  })
  await flushPromises()
  const snackbar = vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
  return { w, snackbar }
}

beforeEach(() => { putError = null; get.mockClear(); put.mockClear() })

describe('the grouped orders under a -R (issues/429)', () => {
  it('lists its open orders with pickup and delivery, date and route', async () => {
    const { w } = await mountGroup()
    expect(get).toHaveBeenCalledWith('orders', { params: expect.objectContaining({ collection_order: 24875, _limit: -1 }) })
    const rows = w.findAll('[data-test="grouped-order"]')
    expect(rows).toHaveLength(2)
    const first = rows[0].text()
    expect(first).toContain('24874')
    expect(first).toContain('18/11/2026')
    expect(first).toContain('DT - MARESME')
    expect(first).toContain('20/11/2026')
    expect(first).toContain('DC - BCN')
    expect(w.text()).toContain('Comanda de recollida agrupada')
    expect(w.text()).toContain('2 comandes')
  })

  it('the order number opens its card in a new tab', async () => {
    const { w } = await mountGroup()
    const link = w.find('[data-test="grouped-order"] a.order-num')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('href')).toContain('/comanda/24874')
  })

  it('edits inline with the pencil, sending only what changed', async () => {
    const { w, snackbar } = await mountGroup()
    await w.find('[data-test="grouped-edit"]').trigger('click')
    expect(w.find('[data-test="edit-pickup-date"]').exists()).toBe(true)
    expect(w.find('[data-test="edit-delivery-route"]').exists()).toBe(true)
    w.vm.form.estimated_delivery_date = new Date(2026, 10, 21)
    await w.vm.save(ORDERS[0])
    expect(put).toHaveBeenCalledWith('orders/24874', { estimated_delivery_date: '2026-11-21' })
    expect(snackbar.mock.calls[0][0].message).toBe('Comanda actualitzada')
  })

  it('a moved pickup takes the order out of the -R, and says so', async () => {
    const { w, snackbar } = await mountGroup()
    w.vm.edit(ORDERS[0])
    w.vm.form.collection_pickup_date = new Date(2026, 10, 19)
    await w.vm.save(ORDERS[0])
    expect(put).toHaveBeenCalledWith('orders/24874', { collection_pickup_date: '2026-11-19' })
    expect(snackbar.mock.calls[0][0].message).toBe('La comanda 24874 té una recollida nova i surt de la 24875-R.')
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('blocks a pickup after the delivery without asking the API', async () => {
    const { w } = await mountGroup()
    w.vm.edit(ORDERS[1])
    w.vm.form.collection_pickup_date = new Date(2026, 10, 20)
    await w.vm.save(ORDERS[1])
    expect(put).not.toHaveBeenCalled()
    expect(w.vm.conflict).toMatchObject({ active: true, orders: [24876] })
    expect(w.vm.conflict.message).toMatch(/després de l'entrega/)
  })

  it('shows the orders the API names when it refuses', async () => {
    const { w } = await mountGroup()
    putError = refusal('No es pot desar la comanda 24874: …', [24874])
    w.vm.edit(ORDERS[0])
    w.vm.form.route = 2
    await w.vm.save(ORDERS[0])
    expect(w.vm.conflict).toEqual({ active: true, message: 'No es pot desar la comanda 24874: …', orders: [24874] })
  })

  it('without permission there is no pencil', async () => {
    const { w } = await mountGroup(false)
    expect(w.find('[data-test="grouped-edit"]').exists()).toBe(false)
  })
})

describe('the blocking notice (issues/429)', () => {
  it('lists the orders, each opening in a new tab', async () => {
    const w = mount(ModalPickupConflict, {
      props: { active: true, message: 'No es pot moure la recollida…', orders: [24874, 24876] },
      global: { plugins: [Buefy, router()] }
    })
    await flushPromises()
    const links = w.findAll('[data-test="conflict-order"]')
    expect(links.map(a => a.text())).toEqual(['24874', '24876'])
    expect(links.every(a => a.attributes('target') === '_blank')).toBe(true)
    expect(links[1].attributes('href')).toContain('/comanda/24876')
    expect(w.text()).toContain('No es pot moure la recollida…')
  })
})

describe('grouped edit helpers (issues/429)', () => {
  it('reads the refusal', () => {
    const error = refusal('No es pot moure…', [1, 2])
    expect(conflictOrders(error)).toEqual([1, 2])
    expect(refusalMessage(error, 'x')).toBe('No es pot moure…')
    expect(conflictOrders({ response: { data: { error: { message: 'altre' } } } })).toEqual([])
    expect(refusalMessage(null, 'per defecte')).toBe('per defecte')
  })

  it('sends only what changed', () => {
    const form = groupedEditForm(ORDERS[0])
    expect(groupedEditPayload(ORDERS[0], form)).toEqual({})
    form.collection_pickup_route = 1
    form.estimated_delivery_date = new Date(2026, 10, 22)
    expect(groupedEditPayload(ORDERS[0], form)).toEqual({ collection_pickup_route: 1, estimated_delivery_date: '2026-11-22' })
    expect(movesPickup({ collection_pickup_route: 1 })).toBe(true)
    expect(movesPickup({ route: 1 })).toBe(false)
  })

  it('pickup up to the delivery day, never after', () => {
    expect(pickupAfterDelivery({ collection_pickup_date: new Date(2026, 10, 20), estimated_delivery_date: new Date(2026, 10, 20) })).toBe(false)
    expect(pickupAfterDelivery({ collection_pickup_date: new Date(2026, 10, 21), estimated_delivery_date: new Date(2026, 10, 20) })).toBe(true)
  })
})
