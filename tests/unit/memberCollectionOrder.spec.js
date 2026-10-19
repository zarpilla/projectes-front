// issues/217, the user's rule (2026-10-19): a member changes the route of her
// collection order while it is pending and cancels it; once processed, no —
// as on master. (A first fix made it read-only for her even while pending.)
import { describe, it, expect } from 'vitest'
import { canEditOrder, canCancelOrder } from '@/domain/orderPermissions'
import { canSetStatus } from '@/domain/orderStatus'

const MEMBER = ['orders']
const OFFICE = ['orders_admin']
const pending = { id: 24947, status: 'pending', is_collection_order: true }
const processed = { ...pending, status: 'processed' }

describe("a member's collection order (issues/217)", () => {
  it('is hers to change and cancel while pending', () => {
    expect(canEditOrder(pending, MEMBER)).toBe(true)
    expect(canCancelOrder(pending, MEMBER)).toBe(true)
    expect(canSetStatus(pending, 'cancelled', false)).toBe(true)
  })

  it('is read-only for her once processed', () => {
    expect(canEditOrder(processed, MEMBER)).toBe(false)
    expect(canCancelOrder(processed, MEMBER)).toBe(false)
    expect(canSetStatus(processed, 'cancelled', false)).toBe(false)
  })

  it("stays the office's", () => {
    expect(canEditOrder(processed, OFFICE)).toBe(true)
    expect(canCancelOrder(processed, OFFICE)).toBe(true)
  })
})
