// Which order fields block a save (OrdersForm's `errors`). Recorded from the
// component before the rules moved to src/domain/orderValidation.js.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'

function prng (seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function cases () {
  const rnd = prng(424242)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const out = []
  for (let i = 0; i < 400; i++) {
    const isPickupPoint = rnd() < 0.3
    out.push({
      form: {
        owner: pick([null, 5]),
        route: pick([null, 3]),
        contact: pick([null, undefined, 0, 10, 99]),
        delivery_date: pick([null, '2026-10-08']),
        delivery_type: pick([null, 1]),
        is_collection_order: rnd() < 0.2,
        pickup: pick([null, undefined, 1, 2]),
        contact_name: pick([null, '', 'Botiga']),
        contact_nif: pick([null, '', 'B123']),
        contact_legal_form: pick([null, 1]),
        contact_address: pick([null, '', 'C/ Major 1']),
        contact_postcode: pick([null, '', '17001']),
        contact_city: pick([null, '', 'Girona']),
        contact_phone: pick([null, '', '600000000']),
        collection_point: pick([null, undefined, 7]),
        collection_pickup_route: pick([null, 4]),
        units: pick([null, 0, -1, 2]),
        kilograms: pick([null, '', 0, 12.5]),
        lines: pick([null, [], [{ units: 1, kilograms: 2, name: 'Caixa' }], [{ units: 0, kilograms: 2, name: 'x' }], [{ units: 1, kilograms: 2, name: '  ' }]])
      },
      contacts: [{ id: 10 }, { id: 11 }],
      collectionPoints: pick([null, [], [{ id: 7 }]]),
      collectionPickupRoutes: pick([[], [{ id: 4 }]]),
      isPickupPoint
    })
  }
  return out
}

const orderErrorsOf = c => OrdersForm.computed.errors.call(c)

describe('OrdersForm validation', () => {
  it('matches the recorded errors of 400 generated orders', () => {
    expect(cases().map(orderErrorsOf)).toMatchSnapshot()
  })

  it('accepts a complete regular order', () => {
    const errors = orderErrorsOf({
      form: {
        owner: 5, route: 3, contact: 10, delivery_date: '2026-10-08', delivery_type: 1, pickup: 1,
        contact_name: 'Botiga', contact_nif: 'B123', contact_legal_form: 1, contact_address: 'C/ Major 1',
        contact_postcode: '17001', contact_city: 'Girona', contact_phone: '600000000', units: 2, kilograms: 12.5
      },
      contacts: [{ id: 10 }], collectionPoints: [], collectionPickupRoutes: [], isPickupPoint: false
    })
    expect(Object.values(errors).some(Boolean)).toBe(false)
  })

  it('rejects a contact that is not in the list', () => {
    const errors = orderErrorsOf({ form: { contact: 99 }, contacts: [{ id: 10 }], collectionPoints: null, collectionPickupRoutes: [], isPickupPoint: false })
    expect(errors.contact).toBe(true)
  })
})
