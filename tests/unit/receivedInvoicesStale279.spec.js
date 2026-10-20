// issues/279: Despeses crashed rendering payrolls of deleted users
// (`users_permissions_user` null → «Cannot read properties of null (reading
// 'username')»), and in Ingressos/Despeses a quick filter change could leave the
// previous, slower load's rows on screen (no sequence guard, as fixed in 219).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { payrollCode, payrollUserName, DELETED_USER } from '@/domain/payrollLabel'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'

const orphanPayroll = { id: 506, emitted: '2025-01-31', total: 1000, total_vat: 0, total_irpf: 0, year: { year: 2025 }, month: { month: 1 }, users_permissions_user: null }

describe('payroll label (issues/279)', () => {
  it('falls back when the user was deleted', () => {
    expect(payrollUserName(orphanPayroll)).toBe(DELETED_USER)
    expect(payrollCode(orphanPayroll)).toBe(`2025-01-${DELETED_USER}`)
    expect(payrollCode({ ...orphanPayroll, users_permissions_user: { username: 'anna' } })).toBe('2025-01-anna')
  })

  it('Despeses renders a payroll of a deleted user', async () => {
    api.get.mockImplementation(async url => {
      if (url.startsWith('payrolls')) return { data: [orphanPayroll] }
      if (url.startsWith('phase-expenses/assigned')) return { data: { invoices: [], expenses: [] } }
      return { data: [] }
    })
    const errors = []
    const w = mount(ReceivedInvoicesTable, {
      props: { year: 2025 },
      global: {
        plugins: [createPinia(), Buefy],
        stubs: { RouterLink: { template: '<a><slot/></a>' }, DownloadExcel: true },
        config: { warnHandler: () => {}, errorHandler: e => errors.push(e) }
      }
    })
    await flushPromises()
    expect(errors).toEqual([])
    expect(w.text()).toContain(`2025-01-${DELETED_USER}`)
  })
})

describe('stale loads (issues/279)', () => {
  beforeEach(() => { api.get.mockReset() })

  const ctx = over => ({
    year: 2026, month: null, quarter: null, contact: null, project: null, paid: null,
    serial: null, code: null, state: 0, documentType: 0,
    assignedToProject: () => false, formatDate: () => '', zeroPad: v => v, ...over
  })

  for (const [name, component, first, assigned] of [
    ['Ingressos', EmittedInvoicesTable, 'emitted-invoices', 'phase-incomes'],
    ['Despeses', ReceivedInvoicesTable, 'received-invoices', 'phase-expenses']
  ]) {
    it(`${name}: an older load finishing last does not overwrite the newer one`, async () => {
      let releaseSlow
      const slow = new Promise(r => { releaseSlow = r })
      api.get.mockImplementation(async url => {
        if (url.startsWith(assigned)) return { data: { invoices: [], expenses: [] } }
        if (url.startsWith(first) && url.includes('2026-01-01')) {
          await slow
          return { data: Array.from({ length: 82 }, (_, i) => ({ id: i, code: `old-${i}`, lines: [] })) }
        }
        if (url.startsWith(first)) return { data: [{ id: 1, code: 'new', lines: [] }, { id: 2, code: 'new2', lines: [] }] }
        return { data: [] }
      })
      const vm = ctx()
      const older = component.methods.getData.call(vm)          // whole year, slow
      vm.month = 3
      await component.methods.getData.call(vm)                  // March, fast
      releaseSlow()
      await older
      expect(vm.emitted.map(r => r.code)).toEqual(['new', 'new2'])
    })
  }
})
