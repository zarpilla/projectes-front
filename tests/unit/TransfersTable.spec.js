// issues/156: in Transferències the KPIs and the tab counts were computed after
// the state filter (the API was asked for the selected states only), so «En
// procés» and «Completades» read 0 while «Pendents» was selected.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const transfer = (id, extra = {}) => ({
  id,
  status: 'pending',
  transfer: true,
  owner: { id: 5, fullname: `Sòcia ${id}` },
  transfer_pickup_origin: { id: 3, name: 'Artés' },
  transfer_pickup_destination: { id: 30, name: 'Girona' },
  ...extra
})
// 3 pending, 2 in progress, 1 completed
const allTransfers = [
  transfer(1), transfer(2), transfer(3),
  transfer(4, { transfer_start_date: '2026-10-17T08:00:00Z' }),
  transfer(5, { transfer_start_date: '2026-10-17T08:00:00Z' }),
  transfer(6, { transfer_start_date: '2026-10-16T08:00:00Z', transfer_end_date: '2026-10-16T12:00:00Z' })
]

// the API applies the state conditions it is sent, like the backend
const matches = (order, params) => {
  const conds = {}
  for (const [key, value] of Object.entries(params || {})) {
    const m = key.match(/^_where\[_and\]\[1\]\[_or\]\[(\d+)\]\[(\w+)\]$/)
    if (m) (conds[m[1]] = conds[m[1]] || {})[m[2]] = value
  }
  const list = Object.values(conds)
  if (!list.length) return true
  return list.some(c => Object.entries(c).every(([k, v]) => {
    const field = k.replace(/_null$/, '')
    return (order[field] == null) === v
  }))
}

const api = {
  get: vi.fn(async (url, opts) => {
    if (url.startsWith('users/me')) return { data: { id: 5, permissions: [{ permission: 'orders_admin' }] } }
    if (url.startsWith('pickups')) return { data: [] }
    if (url === 'orders') return { data: allTransfers.filter(o => matches(o, opts && opts.params)) }
    return { data: [] }
  })
}
vi.mock('@/service/index', () => ({ default: () => api }))
import TransfersTable from '@/components/TransfersTable.vue'

async function mountTable () {
  const w = mount(TransfersTable, {
    global: {
      plugins: [createPinia(), Buefy],
      stubs: { TitleBar: true, QRScannerModal: true, RouterLink: { template: '<a><slot/></a>' } },
      config: { warnHandler: () => {} }
    }
  })
  await flushPromises()
  return w
}

describe('Transferències counts (issues/156)', () => {
  it('counts every state whatever tab is selected', async () => {
    const w = await mountTable()
    expect(w.vm.statusFilter).toEqual(['pending'])
    expect([w.vm.pendingCount, w.vm.inProgressCount, w.vm.completedCount]).toEqual([3, 2, 1])
    expect(w.vm.orders.map(o => o.id)).toEqual([1, 2, 3])

    w.vm.setStatusFilter({}, 'completed')
    await flushPromises()
    expect([w.vm.pendingCount, w.vm.inProgressCount, w.vm.completedCount]).toEqual([3, 2, 1])
    expect(w.vm.orders.map(o => o.id)).toEqual([6])
  })

  it('shows the counts on the tabs', async () => {
    const w = await mountTable()
    const counts = w.findAll('.segmented .count').map(c => c.text())
    expect(counts).toEqual(['3', '2', '1'])
  })
})
