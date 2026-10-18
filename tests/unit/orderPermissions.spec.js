// issues/163 (redesign review 2026-10-18): the order form offered members
// «Iniciar transferència» and «Recollir» on their pending orders, and gave
// drivers the whole order (price, rate, address) of any order. The API now
// refuses both; the screens follow the same rules.
import { describe, it, expect } from 'vitest'
import {
  canCreateOrders,
  canEditOrder,
  canMoveOrder,
  canDepositOrderMove,
  canOpenOrder
} from '@/domain/orderPermissions'

const MEMBER = ['orders']
const DRIVER = ['orders_delivery']
const OFFICE = ['orders_admin']
const pending = { id: 1, status: 'pending' }
const processed = { id: 2, status: 'processed' }
const cancelled = { id: 3, status: 'cancelled' }

describe('order permissions (issues/163)', () => {
  it('a member edits her pending orders and deposits them, but makes no transfer nor loading', () => {
    expect(canEditOrder(pending, MEMBER)).toBe(true)
    expect(canEditOrder(processed, MEMBER)).toBe(false)
    expect(canMoveOrder(pending, MEMBER)).toBe(false)
    expect(canDepositOrderMove(pending, MEMBER)).toBe(true)
    expect(canDepositOrderMove(processed, MEMBER)).toBe(false)
  })

  it('a driver makes the moves of any order but does not edit nor create orders', () => {
    expect(canEditOrder(pending, DRIVER)).toBe(false)
    expect(canEditOrder({ status: 'pending' }, DRIVER)).toBe(false)
    expect(canCreateOrders(DRIVER)).toBe(false)
    expect(canMoveOrder(processed, DRIVER)).toBe(true)
    expect(canMoveOrder(cancelled, DRIVER)).toBe(false)
    expect(canDepositOrderMove(processed, DRIVER)).toBe(true)
    expect(canOpenOrder(processed, DRIVER)).toBe(true)
  })

  it('a driver who is a member too creates orders', () => {
    expect(canCreateOrders([...DRIVER, 'orders'])).toBe(true)
  })

  it('the office edits and moves every order but the cancelled ones', () => {
    expect(canEditOrder(processed, OFFICE)).toBe(true)
    expect(canEditOrder(cancelled, OFFICE)).toBe(false)
    expect(canMoveOrder(processed, OFFICE)).toBe(true)
    expect(canCreateOrders([...OFFICE, ...DRIVER])).toBe(true)
  })
})
