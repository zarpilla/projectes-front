// issues/250: the order view's tracking. The driver's «Carregat» on an order
// that is not picked up at a farm showed as «Recollida a la finca» and the
// «Recorregut» stayed on the deposit; an invoiced collection order hid its
// price and Facturada step and still offered «Recollir»; a delivered order's
// Facturada step said «Quan es lliuri».
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn() }) }))
import OrderView from '@/views/OrderView.vue'
import OrderOperationsTable from '@/components/OrderOperationsTable.vue'

// a stand-in for the component: data, then its computed and methods on demand
function view (order, permissions = ['orders_admin']) {
  const state = { order, permissions, me: { id: 1 }, collectionPointName: '', pickupName: 'Magatzem Girona', routeName: 'Girona', contactName: 'Can Pere' }
  const vm = new Proxy(state, {
    get (target, key) {
      if (key in target) return target[key]
      if (OrderView.computed[key]) return OrderView.computed[key].call(vm)
      if (OrderView.methods[key]) return OrderView.methods[key].bind(vm)
      return undefined
    }
  })
  return vm
}
const step = (vm, key) => vm.timeline.find(s => s.key === key)

describe('order view tracking (issues/250)', () => {
  const loaded = { id: 24867, status: 'processed', pickup: { id: 2, pickup: false }, pickup_date: '2026-10-19T19:45:00Z', pickup_user: { username: 'prova.repartidor' }, createdAt: '2026-10-07T08:00:00Z' }

  it('«Carregat» away from a farm is «Carregada» and moves the journey on', () => {
    const vm = view(loaded)
    expect(step(vm, 'pickup').title).toBe('Carregada')
    expect(vm.currentStep).toBe(2)
    expect(vm.journey[vm.currentStep].current).toBe('repartiment')
  })

  it('a farm pickup keeps «Recollida a la finca»', () => {
    const vm = view({ ...loaded, pickup: { id: 3, pickup: true } })
    expect(step(vm, 'pickup').title).toBe('Recollida a la finca')
  })

  it('a delivered order is pending invoicing, not «Quan es lliuri»', () => {
    const vm = view({ ...loaded, status: 'delivered', delivery_date: '2026-10-20' })
    expect(step(vm, 'invoiced').detail).toBe('Pendent de facturar')
    expect(view({ ...loaded }).timeline.find(s => s.key === 'invoiced').detail).toBe('Quan es lliuri')
  })

  it('an invoiced collection order shows its price and Facturada step, and no «Recollir»', () => {
    const vm = view({ id: 24652, is_collection_order: true, status: 'invoiced', price: 6.26, emitted_invoice: { id: 889 }, pickup: { id: 3, pickup: true } })
    expect(vm.showsPrice).toBe(true)
    expect(step(vm, 'invoiced').done).toBe(true)
    expect(vm.canPickup).toBe(false)
    expect(step(vm, 'pickup').actions.find(a => a.label === 'Recollir').visible).toBe(false)
    expect(vm.nextAction).toBe(null)
    // the template shows the price box on it
    const template = fs.readFileSync(path.resolve(process.cwd(), 'src/views/OrderView.vue'), 'utf8')
    expect(template).toMatch(/<section v-if="showsPrice" class="a-box">\s*<header class="box-head"><h2>Preu<\/h2>/)
  })

  it('a pending collection order without price keeps them hidden, and can be picked up', () => {
    const vm = view({ id: 1, is_collection_order: true, status: 'pending', price: 0, pickup: { id: 3, pickup: true } })
    expect(vm.showsPrice).toBe(false)
    expect(step(vm, 'invoiced')).toBeUndefined()
    expect(vm.canPickup).toBe(true)
  })

  it('no transfer moves on an invoiced order', () => {
    const vm = view({ ...loaded, pickup_date: null, status: 'invoiced', transfer: true })
    expect(vm.canStartTransfer).toBe(false)
  })

  it('the driver\'s dialog says «carregada» for a delivery, «recollida» for a farm pickup', () => {
    for (const [order, word] of [[{ id: 1 }, 'carregada'], [{ id: 2, is_collection_order: true }, 'recollida']]) {
      const confirm = vi.fn()
      OrderOperationsTable.methods.pickupOrder.call({ $buefy: { dialog: { confirm } } }, order)
      expect(confirm.mock.calls[0][0].message).toBe(`Vols marcar aquesta comanda com a ${word}?`)
    }
  })
})
