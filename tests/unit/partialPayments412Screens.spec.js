// issues/412: what the screens do with partial collections and payments.
// Saving a document sends the entries as days, with «Cobrada» and its date set
// from them; Ingressos and Despeses show «Parcial» and what is still pending.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(async () => ({ data: {} })) }
vi.mock('@/service/index', () => ({ default: () => api }))
import DocumentForm from '@/components/DocumentForm.vue'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable.vue'
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'

const day = s => new Date(`${s}T00:00:00`)

describe('DocumentForm saves the partial payments (issues/412)', () => {
  const { computed, methods } = DocumentForm

  // the parts of the form submit() reads, with the real computed values
  const form = partial_payments => {
    const vm = {
      type: 'emitted-invoices',
      user: { id: 3 },
      total: 1000,
      form: {
        id: 9,
        emitted: day('2026-02-01'),
        contact: 8,
        serial: 3,
        projects: [{ id: 7, name: 'Web', project_phases: [] }],
        lines: [],
        paid: false,
        paid_date: null,
        partial_payments
      },
      isLoading: false,
      shouldSaveProject: false,
      validateIfProjectPhasesHasDocument: () => true,
      getData: vi.fn(),
      $buefy: { snackbar: { open: vi.fn() } },
      $router: { push: vi.fn() },
      partialPaymentsChanged: methods.partialPaymentsChanged
    }
    for (const name of ['partialPaymentsAllowed', 'hasPartialPayments', 'partialPaymentsDoc', 'partialPaymentsExceed']) {
      Object.defineProperty(vm, name, { get: () => computed[name].call(vm) })
    }
    return vm
  }

  beforeEach(() => api.put.mockClear())

  it('sends the entries as days and marks it collected on the last date once they reach the total', async () => {
    const vm = form([
      { id: 'a', date: day('2026-03-01'), amount: '600' },
      { date: day('2026-04-02'), amount: 400 }
    ])
    await methods.submit.call(vm, false)

    expect(api.put).toHaveBeenCalledTimes(1)
    const [url, body] = api.put.mock.calls[0]
    expect(url).toBe('emitted-invoices/9')
    expect(body.partial_payments).toEqual([
      { id: 'a', date: '2026-03-01', amount: 600 },
      { date: '2026-04-02', amount: 400 }
    ])
    expect([body.paid, body.paid_date]).toEqual([true, '2026-04-02'])
    expect(body.projects).toEqual([{ id: 7 }])
  })

  it('leaves it not collected while something is pending', async () => {
    const vm = form([{ id: 'a', date: day('2026-03-01'), amount: 600 }])
    await methods.submit.call(vm, false)

    const body = api.put.mock.calls[0][1]
    expect([body.paid, body.paid_date]).toEqual([false, null])
  })
})

describe('Ingressos and Despeses show what is partly collected or paid (issues/412)', () => {
  const doc = {
    id: 1,
    code: '2026-0042',
    state: 'real',
    emitted: '2026-03-01',
    paybefore: '2099-12-31',
    total_base: 826.45,
    total_vat: 173.55,
    total_irpf: 0,
    total: 1000,
    paid: false,
    paid_date: null,
    projects: [],
    lines: [],
    partial_payments: [{ id: 'a', date: '2026-03-10', amount: 600 }]
  }

  const render = async (component, rowsFor) => {
    api.get.mockImplementation(async url => {
      if (url.startsWith('phase-')) return { data: { invoices: [], incomes: [], expenses: [] } }
      return { data: rowsFor(url) }
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(component, {
      props: { year: 2026 },
      global: {
        plugins: [pinia, Buefy],
        stubs: { RouterLink: { template: '<a><slot/></a>' }, 'router-link': true, DownloadExcel: true },
        config: { warnHandler: () => {} }
      }
    })
    await flushPromises()
    return w.text()
  }

  it('Ingressos: an emitted invoice collected in part', async () => {
    const text = await render(EmittedInvoicesTable, url => (url.startsWith('emitted-invoices/basic') ? [doc] : []))
    expect(text).toContain('Parcial')
    expect(text).toMatch(/pendent 400/)
    expect(text).not.toContain('No cobrada')
  })

  it('Despeses: a received invoice paid in part', async () => {
    const text = await render(ReceivedInvoicesTable, url =>
      url.startsWith('received-invoices/list') ? [{ ...doc, code: 'R-7' }] : []
    )
    expect(text).toContain('Parcial')
    expect(text).toMatch(/pendent 400/)
    expect(text).not.toContain('No pagada')
  })
})
