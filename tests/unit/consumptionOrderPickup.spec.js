// issues/146: in «Comanda punt de consum», choosing the «Recollida de la
// comanda» turned the order back into a normal one (lines lost, Caixes/Kg
// back), because updatePickup read `is_pickup_point`, a field pickups don't have.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'

const updatePickup = OrdersForm.methods.updatePickup

function ctx (form) {
  return {
    form,
    allowedPickups: [{ id: 1, name: 'Magatzem', pickup: true }, { id: 2, name: 'Altre', pickup: false }],
    checkTransferNeeded: vi.fn(),
    calculateTotals () { return OrdersForm.methods.calculateTotals.call(this) }
  }
}

describe('updatePickup (issues/146)', () => {
  it('keeps a consumption-point order and its lines when the pickup is chosen', () => {
    const lines = [{ name: 'Anna', nif: '1', units: 2, kilograms: 3 }, { name: 'Pau', nif: '2', units: 1, kilograms: 1 }]
    const c = ctx({ pickup_point: true, pickup: 1, lines: [...lines], units: null, kilograms: null })
    updatePickup.call(c)
    expect(c.form.pickup_point).toBe(true)
    expect(c.form.lines).toEqual(lines)
    c.form.pickup = 2
    updatePickup.call(c)
    expect(c.form.pickup_point).toBe(true)
    expect(c.form.lines).toEqual(lines)
  })

  // issues/230: lines filled before the pickup → boxes/kilos set to null,
  // «Total 0 caixes · 0 kg» and the save refused
  it('keeps the boxes and kilos of the lines when the pickup is chosen (issues/230)', () => {
    const lines = [{ name: 'Anna', nif: '1', units: 2, kilograms: 8 }, { name: 'Pau', nif: '2', units: '1', kilograms: '2.5' }]
    const c = ctx({ pickup_point: true, pickup: 1, lines, units: 3, kilograms: 10.5 })
    updatePickup.call(c)
    expect(c.form.units).toBe(3)
    expect(c.form.kilograms).toBe(10.5)
  })

  it('starts a consumption-point order with one empty line', () => {
    const c = ctx({ pickup_point: true, pickup: 1, lines: [] })
    updatePickup.call(c)
    expect(c.form.lines).toHaveLength(1)
  })

  it('leaves a normal order normal, with its boxes and kilos', () => {
    const c = ctx({ pickup_point: false, pickup: 1, lines: [], units: 3, kilograms: 10 })
    updatePickup.call(c)
    expect(c.form.pickup_point).toBe(false)
    expect(c.form.units).toBe(3)
    expect(c.form.kilograms).toBe(10)
  })

  it('clears the collection point when the pickup has none', () => {
    const c = ctx({ pickup_point: false, pickup: 2, collection_point: 7 })
    updatePickup.call(c)
    expect(c.form.collection_point).toBe(null)
    expect(c.checkTransferNeeded).toHaveBeenCalled()
  })
})
