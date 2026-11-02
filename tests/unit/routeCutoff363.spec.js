// issues/363 (La Diligència): no order for a route after 14 h of the working
// day before («Hora de tancament de la ruta»). The form tells the member the
// route is closed (Joel's text) and offers the next date a route of the
// delivery point's town runs; «Segueix» puts that date, and that route when it
// is another one, on the order. The office can still enter it, with the
// surcharge. Holidays for everyone are no working day.
import { describe, it, expect, afterEach, vi } from 'vitest'
import moment from 'moment'
import 'moment/dist/locale/ca'
import {
  DEFAULT_ROUTE_CLOSED_MESSAGE,
  closingOf,
  isClosedDelivery,
  isClosedPickup,
  lateRules,
  nextOpenDelivery,
  routeClosedMessage
} from '@/domain/lateOrders'

const api = vi.hoisted(() => ({ get: null }))
vi.mock('@/service/index', () => ({ default: () => ({ get: (...a) => api.get(...a), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'
import OrdersTable from '@/components/OrdersTable.vue'
import { signalWhere } from '@/domain/orderSignals'

afterEach(() => vi.useRealTimers())

const wed = hhmm => new Date(`2026-10-21T${hhmm}:00`)
const rules = lateRules({ next_day_limit_hour: 13 })
const ymd = m => moment(m).format('YYYY-MM-DD')

// the town has a Thursday route and a different Friday one
const THU = { id: 1, name: 'DJ - Osona', short_name: 'DJ Osona', thursday: true }
const FRI = { id: 2, name: 'DV - Osona', short_name: 'DV Osona', friday: true }

describe('the closing rules, as the API', () => {
  it('Thursday closes on Wednesday 14 h; Friday is still open', () => {
    expect(isClosedDelivery('2026-10-22', wed('13:59'), rules)).toBe(false)
    expect(isClosedDelivery('2026-10-22', wed('14:00'), rules)).toBe(true)
    expect(isClosedDelivery('2026-10-23', wed('16:00'), rules)).toBe(false)
  })

  it('Monday closes on Friday, and a holiday moves it a working day earlier', () => {
    expect(moment(closingOf('2026-10-26', rules)).format('YYYY-MM-DD HH:mm')).toBe('2026-10-23 14:00')
    const withHoliday = lateRules({ next_day_limit_hour: 13 }, { holidays: ['2026-12-08'] })
    expect(moment(closingOf('2026-12-09', withHoliday)).format('YYYY-MM-DD HH:mm')).toBe('2026-12-07 14:00')
  })

  it('a morning pickup closes too, an afternoon one never', () => {
    expect(isClosedPickup('2026-10-22', wed('14:00'), rules)).toBe(true)
    expect(isClosedPickup('2026-10-22', wed('14:00'), rules, { afternoon: true })).toBe(false)
  })
})

describe('the next date of the town', () => {
  it('is the first day of any of its routes not closed: Friday, on the other route', () => {
    const next = nextOpenDelivery({ routes: [THU, FRI], rules, now: wed('15:00'), prefer: 1 })
    expect(ymd(next.date)).toBe('2026-10-23')
    expect(next.route.id).toBe(2)
  })

  it('keeps the chosen route on a tie and skips its closures', () => {
    const both = { id: 3, name: 'DV bis', friday: true }
    expect(nextOpenDelivery({ routes: [FRI, both], rules, now: wed('15:00'), prefer: 3 }).route.id).toBe(3)
    const closures = [{ date: '2026-10-23', route: { id: 2 } }]
    const next = nextOpenDelivery({ routes: [THU, FRI], closures, rules, now: wed('15:00') })
    expect(ymd(next.date)).toBe('2026-10-29')
    expect(next.route.id).toBe(1)
  })

  it("takes a closed route's substitute on its day", () => {
    const sub = { id: 4, name: 'DS - Substituta', substitute: { date: '2026-10-24' } }
    const closures = [{ date: '2026-10-23', route: { id: 2 } }]
    const next = nextOpenDelivery({ routes: [FRI, sub], closures, rules, now: wed('15:00') })
    expect(ymd(next.date)).toBe('2026-10-24')
    expect(next.route.id).toBe(4)
  })

  it("is said with Joel's text, the date and the route", () => {
    const text = routeClosedMessage(DEFAULT_ROUTE_CLOSED_MESSAGE, { date: moment('2026-10-23'), route: FRI })
    expect(text).toBe(
      'A aquesta hora aquesta ruta ja és tancada. En cas que estiguis entrant una comanda per a divendres 23/10 (DV Osona), ' +
        'clica «Segueix» per seguir el procediment o torna enrere.'
    )
    expect(text).not.toContain('setmana')
  })
})

describe('the order form', () => {
  const vmFor = ({ permissions = ['orders'], form = {}, onDialog } = {}) => {
    const vm = {
      permissions,
      form: { status: 'pending', route: 1, estimated_delivery_date: moment('2026-10-22').toDate(), ...form },
      storedDates: null,
      ordersOptions: { next_day_limit_hour: 13, late_surcharge: 15 },
      nextDayLimitHour: 13,
      holidays: [],
      routes: [THU, FRI],
      routeFestives: [],
      collectionPickupRoutes: [],
      dateWarningMessage: '',
      changeRoute: vi.fn(async () => {}),
      $buefy: { dialog: { confirm: vi.fn(onDialog) }, snackbar: { open: vi.fn() } }
    }
    for (const name of ['dateRulesExempt', 'lateRulesNow']) {
      Object.defineProperty(vm, name, { get: () => OrdersForm.computed[name].call(vm) })
    }
    for (const name of ['afternoonPickupNeedsNewCollection', 'closedDeliveryDate', 'closedPickupDate', 'offerNextOpenDelivery', 'applyNextOpenDelivery', 'percent']) {
      vm[name] = OrdersForm.methods[name]
    }
    return vm
  }
  const now = when => {
    vi.useFakeTimers()
    vi.setSystemTime(when)
  }

  it('«Segueix» moves the order to the next date, on the other route', async () => {
    now(wed('15:00'))
    const vm = vmFor({ onDialog: o => o.onConfirm() })
    expect(await OrdersForm.methods.confirmClosedRoute.call(vm)).toBe(true)
    const dialog = vm.$buefy.dialog.confirm.mock.calls[0][0]
    expect(dialog.title).toBe('Ruta tancada')
    expect(dialog.message).toContain('divendres 23/10 (DV Osona)')
    expect(dialog.confirmText).toBe('Segueix')
    expect(ymd(vm.form.estimated_delivery_date)).toBe('2026-10-23')
    expect(vm.form.route).toBe(2)
    expect(vm.changeRoute).toHaveBeenCalledWith({ keepDate: true })
    // the list's «Redirigida» signal says from where
    expect(vm.form.route_redirected_from).toBe('DJ Osona, dijous 22/10')
  })

  it('a date picked by hand is no redirection any more', async () => {
    const vm = vmFor({ form: { route_redirected_from: 'DJ Osona, dijous 22/10' } })
    vm.routes = []
    vm.checkMultidelivery = vi.fn()
    await OrdersForm.methods.checkEstimatedDeliveryDate.call(vm)
    expect(vm.form.route_redirected_from).toBe(null)
  })

  it('«Torna» saves nothing', async () => {
    now(wed('15:00'))
    const vm = vmFor({ onDialog: o => o.onCancel() })
    expect(await OrdersForm.methods.confirmClosedRoute.call(vm)).toBe(false)
    expect(ymd(vm.form.estimated_delivery_date)).toBe('2026-10-22')
    expect(vm.form.route).toBe(1)
  })

  it('asks nothing before the closing, nor for a date already saved, nor the office', async () => {
    now(wed('13:30'))
    expect(await OrdersForm.methods.confirmClosedRoute.call(vmFor())).toBe(true)
    now(wed('15:00'))
    const stored = vmFor()
    stored.storedDates = { estimated_delivery_date: '2026-10-22' }
    expect(await OrdersForm.methods.confirmClosedRoute.call(stored)).toBe(true)
    const office = vmFor({ permissions: ['orders_admin'] })
    expect(await OrdersForm.methods.confirmClosedRoute.call(office)).toBe(true)
    expect(office.$buefy.dialog.confirm).not.toHaveBeenCalled()
  })

  it("refuses a member's closed morning pickup", async () => {
    now(wed('15:00'))
    const vm = vmFor({ form: { estimated_delivery_date: moment('2026-10-24').toDate(), collection_point: 8, collection_pickup_route: 5, collection_pickup_date: moment('2026-10-22').toDate() } })
    vm.collectionPickupRoutes = [{ id: 5, afternoon: false }]
    expect(await OrdersForm.methods.confirmClosedRoute.call(vm)).toBe(false)
    expect(vm.$buefy.snackbar.open.mock.calls[0][0].message).toContain('La recollida de dijous 22/10 ja és tancada')
  })

  it('tells the office its new late order pays the surcharge', async () => {
    now(wed('15:00'))
    const vm = vmFor({ permissions: ['orders_admin'], onDialog: o => o.onConfirm() })
    expect(await OrdersForm.methods.confirmOfficeLate.call(vm)).toBe(true)
    const dialog = vm.$buefy.dialog.confirm.mock.calls[0][0]
    expect(dialog.message).toContain('La ruta ja és tancada per a aquest dia.')
    expect(dialog.message).toContain('recàrrec del 15 %')
  })

  // issues/363: on an afternoon route, from 10 h of the pickup's own day, a
  // new pickup can only join the member's pending collection order (-R)
  describe('an afternoon pickup for today from 10 h', () => {
    const pickupVm = () => {
      const vm = vmFor({ form: { owner: 54, estimated_delivery_date: moment('2026-10-24').toDate(), collection_point: 8, collection_pickup_route: 6, collection_pickup_date: moment('2026-10-21').toDate() } })
      vm.collectionPickupRoutes = [{ id: 6, afternoon: true }]
      return vm
    }

    it('is refused when it would create a new collection order', async () => {
      now(wed('10:00'))
      api.get = vi.fn(async () => ({ data: [{ id: 71, collection_pickup_date: '2026-10-22' }] }))
      const vm = pickupVm()
      expect(await OrdersForm.methods.confirmClosedRoute.call(vm)).toBe(false)
      expect(api.get.mock.calls[0][0]).toContain('_where[is_collection_order]=true&_where[status]=pending&_where[owner]=54&_where[contact]=8&_where[route]=6')
      expect(vm.$buefy.snackbar.open.mock.calls[0][0].message).toContain('a partir de les 10 h')
    })

    it('joins the pending one of the day', async () => {
      now(wed('15:00'))
      api.get = vi.fn(async () => ({ data: [{ id: 70, collection_pickup_date: '2026-10-21' }] }))
      expect(await OrdersForm.methods.confirmClosedRoute.call(pickupVm())).toBe(true)
    })

    it('asks nothing before 10 h', async () => {
      now(wed('09:59'))
      api.get = vi.fn(async () => ({ data: [] }))
      expect(await OrdersForm.methods.confirmClosedRoute.call(pickupVm())).toBe(true)
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  it('tells the office without a surcharge when the tenant has none (0 % by default)', async () => {
    now(wed('13:30'))
    const vm = vmFor({ permissions: ['orders_admin'], onDialog: o => o.onConfirm() })
    vm.ordersOptions = { next_day_limit_hour: 13 }
    expect(await OrdersForm.methods.confirmOfficeLate.call(vm)).toBe(true)
    const dialog = vm.$buefy.dialog.confirm.mock.calls[0][0]
    expect(dialog.message).toBe("És una comanda fora de temps: es marcarà com a tal i s'obrirà una incidència.")
  })
})

describe('the orders list (issues/363)', () => {
  const ctx = { isFutureWeek: () => false }
  it('shows a redirected order with its signal, in the legend and the filter too', () => {
    const signals = OrdersTable.methods.signalsOf.call(ctx, { id: 1, route_redirected_from: 'DJ Osona, dijous 22/10' })
    expect(signals).toEqual([
      { key: 'redirected', kind: 'is-next', icon: 'directions-fork', label: 'Ruta tancada: redirigida des de DJ Osona, dijous 22/10' }
    ])
    expect(OrdersTable.methods.signalsOf.call(ctx, { id: 2 })).toEqual([])
    const legend = OrdersTable.computed.signalLegend.call({})
    expect(legend.find(l => l.key === 'redirected')).toMatchObject({ icon: 'directions-fork', legend: 'Ruta tancada, redirigida' })
    expect(signalWhere('redirected')).toEqual(['_where[route_redirected_from_null]=false'])
  })
})
