// issues/216 (redesign review 5, 2026-10-19): opening a pending order and
// saving it unchanged moved its expected delivery date to the route's next
// day: getData called citySelected, which with one route for the town ran
// changeRoute, and changeRoute rewrites the date of pending orders. Loading
// keeps the stored route and date; picking a town or a route still proposes
// the next date, like on a new order.
import { describe, it, expect, vi, afterEach } from 'vitest'
import moment from 'moment'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn(async () => ({ data: {} })) })
}))
import OrdersForm from '@/components/OrdersForm.vue'

afterEach(() => vi.useRealTimers())

// a route that runs every weekday, linked to town 4
const ROUTE = { id: 5, name: 'Ruta prova', active: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true }
const OTHER = { id: 6, name: 'Ruta altra', active: true, monday: true }
const STORED = new Date(2026, 9, 29) // 29/10/2026

function formVm (form, cityRoutes = [{ city: { id: 4 }, route: ROUTE }]) {
  const vm = {
    form: { status: 'pending', owner: 2, route: 5, contact: null, estimated_delivery_date: STORED, ...form },
    routes: [],
    cityRoutes,
    routeFestives: [],
    nextDayLimitHour: 14,
    permissions: ['orders_admin'],
    dateWarningMessage: '',
    orders: [],
    $buefy: { toast: { open: vi.fn() } },
    checkMultidelivery: vi.fn(async () => {}),
    checkTransferNeeded: vi.fn()
  }
  vm.validCityRoutes = OrdersForm.methods.validCityRoutes.bind(vm)
  vm.changeRoute = OrdersForm.methods.changeRoute.bind(vm)
  return vm
}

const day = d => moment(d).format('YYYY-MM-DD')
const TOWN = { id: 4, name: 'Poble Prova' }

describe("an order's delivery date when the form is opened (issues/216)", () => {
  it('stays when the order is loaded', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-19T10:00:00'))
    const vm = formVm()
    await OrdersForm.methods.citySelected.call(vm, TOWN, { loading: true })
    expect(day(vm.form.estimated_delivery_date)).toBe('2026-10-29')
    expect(vm.form.route).toBe(5)
    // what goes with the route is still loaded
    expect(vm.checkMultidelivery).toHaveBeenCalled()
  })

  it('keeps the stored route when the town has another one now', async () => {
    const vm = formVm({}, [{ city: { id: 4 }, route: OTHER }])
    await OrdersForm.methods.citySelected.call(vm, TOWN, { loading: true })
    expect(vm.form.route).toBe(5)
    expect(day(vm.form.estimated_delivery_date)).toBe('2026-10-29')
  })

  it("moves to the route's next day when the user picks the town", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-19T10:00:00')) // Monday, before the cutoff
    const vm = formVm({ route: null })
    await OrdersForm.methods.citySelected.call(vm, TOWN)
    expect(vm.form.route).toBe(5)
    expect(day(vm.form.estimated_delivery_date)).toBe('2026-10-20')
  })

  it('moves when the user picks the route', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-19T10:00:00'))
    const vm = formVm()
    vm.routes = [ROUTE]
    await vm.changeRoute()
    expect(day(vm.form.estimated_delivery_date)).toBe('2026-10-20')
  })
})
