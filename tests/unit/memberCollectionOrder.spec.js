// issues/217 (redesign review 5, 2026-10-19): a member's farm-pickup order with
// a collection point generates a collection order owned by her. She could
// change its route (and so its rate and price) or cancel it, and the order
// form offered her «Anul·la la comanda» on it. The API now refuses the state
// change and drops route, delivery type, rate, pickup and comments; the form
// is read-only for her there and offers no cancel. The office is unchanged.
import { describe, it, expect } from 'vitest'
import { canEditOrder, canCancelOrder, canOpenOrder, isMemberCollectionOrder } from '@/domain/orderPermissions'
import { canSetStatus } from '@/domain/orderStatus'

const MEMBER = ['orders']
const OFFICE = ['orders_admin']
const DRIVER = ['orders_delivery']
const COLLECTION = { id: 24947, status: 'pending', is_collection_order: true }
const ORDER = { id: 24946, status: 'pending', is_collection_order: false }

describe("a member's collection order (issues/217)", () => {
  it('is read-only for her and has no «Anul·la la comanda»', () => {
    expect(canEditOrder(COLLECTION, MEMBER)).toBe(false)
    expect(canCancelOrder(COLLECTION, MEMBER)).toBe(false)
    // her own order stays hers
    expect(canEditOrder(ORDER, MEMBER)).toBe(true)
    expect(canCancelOrder(ORDER, MEMBER)).toBe(true)
  })

  it('still opens, to be seen', () => {
    expect(canOpenOrder(COLLECTION, MEMBER)).toBe(true)
    expect(isMemberCollectionOrder(COLLECTION, MEMBER)).toBe(true)
    expect(isMemberCollectionOrder(ORDER, MEMBER)).toBe(false)
  })

  it('is left out of her bulk cancel in Comandes', () => {
    expect(canSetStatus(COLLECTION, 'cancelled', false)).toBe(false)
    expect(canSetStatus(ORDER, 'cancelled', false)).toBe(true)
  })

  it('stays the office’s to change and cancel', () => {
    expect(canEditOrder(COLLECTION, OFFICE)).toBe(true)
    expect(canCancelOrder(COLLECTION, OFFICE)).toBe(true)
    expect(canSetStatus(COLLECTION, 'cancelled', true)).toBe(true)
    expect(isMemberCollectionOrder(COLLECTION, OFFICE)).toBe(false)
    expect(isMemberCollectionOrder(COLLECTION, DRIVER)).toBe(false)
  })
})
