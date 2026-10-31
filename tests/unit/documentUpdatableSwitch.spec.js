import { describe, it, expect, vi } from 'vitest'
import DocumentForm from '@/components/DocumentForm.vue'

// 2026-10-31: «Modificable» doesn't apply to emitted invoices any more
// (issuing one locks its fiscal data, what VeriFactu asks for). On the other
// documents it was a one-way switch: an admin can now «Desbloqueja» it.

vi.mock('@/service/index', () => ({ default: () => ({ put: put }) }))
const put = vi.fn(async () => ({ data: { updatable: true } }))

const { hasUpdatableSwitch, isLocked, isAppAdmin } = DocumentForm.computed
const { unlockDocument } = DocumentForm.methods

describe('«Modificable» switch', () => {
  it('is gone from emitted invoices, payrolls and quotes', () => {
    expect(hasUpdatableSwitch.call({ type: 'emitted-invoices' })).toBe(false)
    expect(hasUpdatableSwitch.call({ type: 'payrolls' })).toBe(false)
    expect(hasUpdatableSwitch.call({ type: 'quotes' })).toBe(false)
  })

  it('stays on received documents', () => {
    for (const type of ['received-invoices', 'received-expenses', 'received-incomes', 'tickets', 'diets']) {
      expect(hasUpdatableSwitch.call({ type })).toBe(true)
    }
  })

  it('locks only a saved document read with the switch off', () => {
    expect(isLocked.call({ form: { id: 3 }, lockedOnLoad: true })).toBe(true)
    expect(isLocked.call({ form: { id: 3 }, lockedOnLoad: false })).toBe(false)
    expect(isLocked.call({ form: {}, lockedOnLoad: true })).toBe(false)
  })

  it('offers «Desbloqueja» to app admins only', () => {
    expect(isAppAdmin.call({ user: { permissions: [{ permission: 'admin' }] } })).toBe(true)
    expect(isAppAdmin.call({ user: { permissions: [{ permission: 'projects' }] } })).toBe(false)
  })

  it('unlocks through the admin route', async () => {
    const vm = {
      type: 'received-invoices',
      form: { id: 9, updatable: false },
      lockedOnLoad: true,
      historyKey: 0,
      $buefy: { snackbar: { open: vi.fn() } }
    }
    await unlockDocument.call(vm)
    expect(put).toHaveBeenCalledWith('document-unlock/received-invoices/9')
    expect(vm.form.updatable).toBe(true)
    expect(vm.lockedOnLoad).toBe(false)
  })
})
