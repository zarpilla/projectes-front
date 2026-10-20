// issues/296 follow-up (verification, 2026-10-20): opening processed order
// 24871 and invoiced 15068 and saving without changes turned them into
// transfers. The point's town has one route, so loading the order ran
// changeRoute → checkTransferNeeded, which set `transfer: true` and the origin
// pickup, and the save sent them. Loading an order keeps its transfer, and a
// saved order past «Pendent» is never recomputed.
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'

const ROUTE = { id: 2, name: 'DT - MARESME', tuesday: true, transfer_pickup: { id: 1 } }

// pickup 3 is in town 50, and route 2 does not go there: a transfer is needed
const formVm = form => {
  const vm = {
    form: { owner: 65, route: 2, pickup: 3, transfer: false, transfer_pickup_origin: null, transfer_pickup_destination: null, ...form },
    routes: [ROUTE],
    pickups: [{ id: 3, pickup: false, city: { id: 50 } }],
    cityRoutes: [],
    sociesContacts: [],
    cities: [],
    validCityRoutes: () => [ROUTE],
    checkMultidelivery: async () => {},
    permissions: [],
    routeFestives: [],
    $buefy: { toast: { open: () => {} } }
  }
  vm.changeRoute = OrdersForm.methods.changeRoute.bind(vm)
  vm.checkTransferNeeded = OrdersForm.methods.checkTransferNeeded.bind(vm)
  return vm
}

const town = { id: 9, name: 'Manlleu' }

describe('the transfer of a loaded order (issues/296)', () => {
  it('stays as stored when a processed order is loaded', async () => {
    const vm = formVm({ id: 24871, status: 'processed' })
    await OrdersForm.methods.citySelected.call(vm, town, { loading: true })
    expect(vm.form.transfer).toBe(false)
    expect(vm.form.transfer_pickup_origin).toBeNull()
  })

  it('stays as stored when a pending order is loaded', async () => {
    const vm = formVm({ id: 24810, status: 'pending' })
    await OrdersForm.methods.citySelected.call(vm, town, { loading: true })
    expect(vm.form.transfer).toBe(false)
  })

  it('is not recomputed for an invoiced order, even when its route changes', async () => {
    const vm = formVm({ id: 15068, status: 'invoiced' })
    await vm.changeRoute({ keepDate: true })
    expect(vm.form.transfer).toBe(false)
    expect(vm.form.transfer_pickup_origin).toBeNull()
  })

  it('is recomputed when the route of a pending order is picked', async () => {
    const vm = formVm({ id: 24810, status: 'pending' })
    vm.checkTransferNeeded()
    expect(vm.form.transfer).toBe(true)
    expect(vm.form.transfer_pickup_origin).toBe(3)
    expect(vm.form.transfer_pickup_destination).toBe(1)
  })

  it('is computed for a new order', async () => {
    const vm = formVm({ status: 'pending' })
    await OrdersForm.methods.citySelected.call(vm, town)
    expect(vm.form.transfer).toBe(true)
  })
})
