// issues/042 — bestretes (payrolls) are sometimes paid from a bank other than
// the main one. The payroll form has a bank account dropdown bound to
// payrollBankAccount, which reads the populated relation and saves it as { id }.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))

import DocumentForm from '@/components/DocumentForm.vue'

const { get, set } = DocumentForm.computed.payrollBankAccount

describe('DocumentForm payrollBankAccount', () => {
  it('reads the id of the populated bank account', () => {
    expect(get.call({ form: { bank_account: { id: 3, name: 'Triodos' } } })).toBe(3)
  })

  it('reads a bare id or no bank', () => {
    expect(get.call({ form: { bank_account: 4 } })).toBe(4)
    expect(get.call({ form: { bank_account: null } })).toBeNull()
    expect(get.call({ form: {} })).toBeNull()
  })

  it('stores the chosen bank as { id }', () => {
    const vm = { form: { bank_account: { id: 1, name: 'Cajamar' } } }
    set.call(vm, 3)
    expect(vm.form.bank_account).toEqual({ id: 3 })
    set.call(vm, null)
    expect(vm.form.bank_account).toBeNull()
  })
})
