// issues/199: ticket 001 added PUT /api/emitted-invoices/:id/payment-method,
// but the issued-invoice view only showed the method as text and the lock note
// said it couldn't change. Projects/admin users can change it there now.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = { get: vi.fn(), put: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))

import DocumentForm from '@/components/DocumentForm.vue'

const { canChangePaymentMethod } = DocumentForm.computed
const { savePaymentMethod } = DocumentForm.methods

const vm = (overrides = {}) => ({
  form: { id: 7, state: 'real', payment_method: 1, bank_account: { id: 10 } },
  newPaymentMethod: 2,
  paymentMethodId: 1,
  savingPaymentMethod: false,
  historyKey: 0,
  $buefy: { snackbar: { open: vi.fn() } },
  ...overrides
})

describe('payment method of an issued invoice (issues/199)', () => {
  beforeEach(() => {
    api.put.mockReset()
  })

  it('can be changed on an issued invoice by projects/admin users', () => {
    const ctx = { entity: 'emitted-invoice', form: { id: 7, state: 'real' }, canSeeHistory: true }
    expect(canChangePaymentMethod.call(ctx)).toBe(true)
    expect(canChangePaymentMethod.call({ ...ctx, canSeeHistory: false })).toBe(false)
    expect(canChangePaymentMethod.call({ ...ctx, form: { id: 7, state: 'draft' } })).toBe(false)
    expect(canChangePaymentMethod.call({ ...ctx, entity: 'received-invoice' })).toBe(false)
  })

  it('saves it through the endpoint and refreshes the history', async () => {
    api.put.mockResolvedValue({ data: { id: 7, payment_method: { id: 2, name: 'Banc B' }, bank_account: { id: 20 } } })
    const ctx = vm()
    await savePaymentMethod.call(ctx)

    expect(api.put).toHaveBeenCalledWith('/emitted-invoices/7/payment-method', { payment_method: 2 })
    expect(ctx.form.payment_method).toBe(2)
    expect(ctx.form.bank_account).toEqual({ id: 20 })
    expect(ctx.historyKey).toBe(1)
    expect(ctx.savingPaymentMethod).toBe(false)
  })

  it('goes back to the saved method when the API refuses', async () => {
    api.put.mockRejectedValue(new Error('403'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ctx = vm()
    await savePaymentMethod.call(ctx)

    expect(ctx.form.payment_method).toBe(1)
    expect(ctx.newPaymentMethod).toBe(1)
    expect(ctx.historyKey).toBe(0)
  })
})
