// issues/186: every new order is created pending (the API forces it), so the
// order form doesn't offer the state buttons on a new order, for any role;
// existing orders keep them.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'

const pick = (form, permissions) =>
  OrdersForm.methods.canPickStatus.call({ form, firstStatus: form.status, isStaff: true, permissions }, 'processed')

describe('the state of a new order (issues/186)', () => {
  it('is not picked: it is created pending', () => {
    expect(pick({ status: 'pending' }, ['orders_admin'])).toBe(false)
    expect(pick({ id: 0, status: 'pending' }, ['orders_delivery'])).toBe(false)
  })

  it('stays picked on an existing order', () => {
    expect(pick({ id: 5, status: 'pending' }, ['orders_admin'])).toBe(true)
  })
})
