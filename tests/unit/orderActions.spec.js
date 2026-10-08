// OrdersForm status actions: deposit, pickup and transfer start/end, and
// clearing each of them. Records exactly what each one sends and shows.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const api = { get: vi.fn(), put: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import OrdersForm from '@/components/OrdersForm.vue'

const NOW = new Date('2026-10-08T10:00:00.000Z')

function fakeVm ({ confirm = true, failPut = false } = {}) {
  const calls = []
  api.get.mockReset().mockImplementation(async url => {
    calls.push(['GET', url])
    return { data: { id: 77 } }
  })
  api.put.mockReset().mockImplementation(async (url, body) => {
    calls.push(['PUT', url, body])
    if (failPut) throw new Error('boom')
    return { data: {} }
  })
  const vm = {
    form: { id: 123, contact_legal_form: 1 },
    isLoading: false,
    submit: vi.fn(async exit => { calls.push(['submit', exit]) }),
    getData: vi.fn(async () => { calls.push(['getData']) }),
    $buefy: {
      snackbar: { open: vi.fn(o => calls.push(['snackbar', o.message, o.type, o.queue])) },
      dialog: { confirm: vi.fn(o => { calls.push(['confirm', o.message]); if (confirm) return o.onConfirm() }) }
    }
  }
  vm.ensureContactLegalFormIsValid = OrdersForm.methods.ensureContactLegalFormIsValid.bind(vm)
  for (const [name, fn] of Object.entries(OrdersForm.methods)) {
    if (!(name in vm)) vm[name] = fn.bind(vm)
  }
  return { vm, calls }
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW) })
afterEach(() => vi.useRealTimers())

const run = async (name, opts) => {
  const { vm, calls } = fakeVm(opts)
  await OrdersForm.methods[name].call(vm)
  // the confirm callback may still be running
  await vi.waitFor(() => expect(vm.isLoading).toBe(false))
  return { calls, loading: vm.isLoading }
}

const MARK = ['depositOrder', 'pickupOrder', 'startTransfer', 'endTransfer']
const CLEAR = ['removeDeposit', 'removePickup', 'removeTransferStart', 'removeTransferEnd']

describe('OrdersForm status actions', () => {
  it.each(MARK)('%s saves the order, then stamps date and user', async name => {
    expect(await run(name)).toMatchSnapshot()
  })

  it.each(MARK)('%s reports an error when the update fails', async name => {
    expect(await run(name, { failPut: true })).toMatchSnapshot()
  })

  it.each(CLEAR)('%s asks first, then clears date and user', async name => {
    expect(await run(name)).toMatchSnapshot()
  })

  it.each(CLEAR)('%s does nothing when not confirmed', async name => {
    const { vm, calls } = fakeVm({ confirm: false })
    await OrdersForm.methods[name].call(vm)
    expect(calls.filter(c => c[0] !== 'confirm')).toEqual([])
  })

  it.each(CLEAR)('%s reports an error when the update fails', async name => {
    expect(await run(name, { failPut: true })).toMatchSnapshot()
  })
})
