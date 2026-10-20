// issues/298 (review 9): the order view of a consumption-point order read
// «Comanda #24898 (Punt Recollida)» («Punt de consum» everywhere else), and a
// farm pickup (-R #24894) showed «Ruta completa Girona -> DT - (TARDA)
// EMPORDÀ», as if it were delivered out of the warehouse on that route.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn() }) }))
import OrderView from '@/views/OrderView.vue'

function view (order) {
  const state = { order, permissions: ['orders_admin'], me: { id: 1 } }
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

describe('order view wording (issues/298)', () => {
  it('names a consumption-point order «Punt de consum»', () => {
    expect(view({ id: 24898, pickup_point: true }).formCardTitle).toBe('Comanda #24898 (Punt de consum)')
  })

  it('shows a farm pickup going from the farm to the warehouse', () => {
    const vm = view({
      id: 24894,
      is_collection_order: true,
      contact: { trade_name: 'Mas Pla' },
      pickup: { name: 'Girona', pickup: false },
      route: { name: 'DT - (TARDA) EMPORDÀ' }
    })
    expect(vm.formCardTitle).toBe('Comanda #24894-R')
    expect(vm.routeLabel).toBe('Recollida:')
    expect(vm.transferPickupText).toBe('Mas Pla -> Girona')
  })

  it('keeps the full route of a delivery', () => {
    const vm = view({ id: 1, pickup: { name: 'Artés' }, transfer_pickup_destination: { name: 'Girona' }, route: { name: 'R1' } })
    expect(vm.routeLabel).toBe('Ruta completa (Transfer):')
    expect(vm.transferPickupText).toBe('Artés -> Girona -> R1')
  })
})
