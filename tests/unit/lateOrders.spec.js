// issues/315 (2026-10-21, La Diligència): an order for tomorrow entered past
// «Hora límit per a l'endemà» was moved by the form to a later route day (often
// next week's, shown grey among the orders entered on time). It now stays for
// the day asked, late: the member reads a configurable warning before saving,
// the order is red in the lists with a surcharge dot, and the office unchecks
// «Recàrrec per incidència» to take it off. A farm pickup entered too late
// warns the same way, without surcharge.
import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_LATE_ORDER_MESSAGE,
  isLateDelivery,
  isLatePickup,
  lateMessage,
  lateRules,
  lateWarnings
} from '@/domain/lateOrders'
import { invoicedPrice } from '@/domain/logisticsInvoicing'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'
import OrdersTable from '@/components/OrdersTable.vue'

const at = hhmm => new Date(`2026-10-21T${hhmm}:00`)
const rules = lateRules({ next_day_limit_hour: 13 })

describe('the rules, as the API (issues/315)', () => {
  it('a delivery for tomorrow is late from the next-day limit', () => {
    expect(isLateDelivery('2026-10-22', at('12:59'), rules)).toBe(false)
    expect(isLateDelivery('2026-10-22', at('13:00'), rules)).toBe(true)
    expect(isLateDelivery(new Date('2026-10-22T00:00:00'), at('13:00'), rules)).toBe(true)
    expect(isLateDelivery('2026-10-23', at('20:00'), rules)).toBe(false)
  })

  it('an afternoon pickup is late on its day from 10 h, a morning one from the limit of the day before', () => {
    expect(isLatePickup('2026-10-21', at('09:59'), rules, { afternoon: true })).toBe(false)
    expect(isLatePickup('2026-10-21', at('10:00'), rules, { afternoon: true })).toBe(true)
    expect(isLatePickup('2026-10-22', at('13:00'), rules)).toBe(true)
    expect(isLatePickup('2026-10-22', at('12:00'), rules)).toBe(false)
  })

  it('fills the hours and the surcharge of the texts', () => {
    const text = lateMessage(DEFAULT_LATE_ORDER_MESSAGE, lateRules({ next_day_limit_hour: 13, late_surcharge: 25 }))
    expect(text).toContain('límit horari de les 13h del dia laborable anterior')
    expect(text).toContain("s'aplicarà un recàrrec del 25% automàticament")
    expect(lateMessage('{hora_tarda}h / {hora}h / {recarrec}%', lateRules({ late_surcharge: 12.5 }))).toBe('10h / 14h / 12,5%')
  })
})

describe('what the member is told before saving', () => {
  const options = { next_day_limit_hour: 13, late_order_message: 'Tard! {recarrec}%' }

  it('a late order, with the configured text', () => {
    const w = lateWarnings({ estimated_delivery_date: '2026-10-22' }, null, options, { now: at('14:00') })
    expect(w).toEqual([{ key: 'order', text: 'Tard! 25%' }])
  })

  it('nothing when the date was already there', () => {
    const stored = { estimated_delivery_date: '2026-10-22' }
    expect(lateWarnings({ estimated_delivery_date: '2026-10-22' }, stored, options, { now: at('14:00') })).toEqual([])
  })

  it('a late pickup, with the default text', () => {
    const form = { estimated_delivery_date: '2026-10-24', collection_point: 8, collection_pickup_date: '2026-10-21' }
    const w = lateWarnings(form, null, options, { now: at('10:30'), afternoon: true })
    expect(w.map(x => x.key)).toEqual(['pickup'])
    expect(w[0].text).toContain('límit de les 10h del mateix dia')
  })
})

describe('the price', () => {
  it('adds the surcharge before the discounts, as the invoice', () => {
    expect(invoicedPrice({ price: 10, volume_discount: 2, multidelivery_discount: 10, late_order: true, late_surcharge: 25 })).toBe(9)
    expect(invoicedPrice({ price: 10, late_order: false, late_surcharge: 25 })).toBe(10)
  })
})

describe('the order form', () => {
  const vmFor = ({ permissions = ['orders'], form = {}, onDialog } = {}) => ({
    permissions,
    form: { estimated_delivery_date: '2026-10-22', ...form },
    storedDates: null,
    ordersOptions: { next_day_limit_hour: 13 },
    collectionPickupRoutes: [],
    get dateRulesExempt() {
      return OrdersForm.computed.dateRulesExempt.call(this)
    },
    $buefy: { dialog: { confirm: vi.fn(onDialog) } }
  })

  it('asks the member before saving a late order, and goes back when she says so', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(at('14:00'))
    const back = vmFor({ onDialog: o => o.onCancel() })
    expect(await OrdersForm.methods.confirmLate.call(back)).toBe(false)
    const dialog = back.$buefy.dialog.confirm.mock.calls[0][0]
    expect(dialog.title).toBe('Comanda fora de temps')
    expect(dialog.message).toContain('Estàs informant tard aquesta comanda!')

    const save = vmFor({ onDialog: o => o.onConfirm() })
    expect(await OrdersForm.methods.confirmLate.call(save)).toBe(true)
    vi.useRealTimers()
  })

  it("doesn't ask the office, nor for an order on time", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(at('14:00'))
    const office = vmFor({ permissions: ['orders_admin'] })
    expect(await OrdersForm.methods.confirmLate.call(office)).toBe(true)
    const onTime = vmFor({ form: { estimated_delivery_date: '2026-10-24' } })
    expect(await OrdersForm.methods.confirmLate.call(onTime)).toBe(true)
    expect(onTime.$buefy.dialog.confirm).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('«Recàrrec per incidència» takes the surcharge off and puts it back', () => {
    const vm = { form: { late_order: true, late_surcharge: 25 }, lateSurchargeSetting: 30 }
    OrdersForm.methods.setLateOrder.call(vm, false)
    expect(vm.form).toEqual({ late_order: false, late_surcharge: 0 })
    OrdersForm.methods.setLateOrder.call(vm, true)
    expect(vm.form).toEqual({ late_order: true, late_surcharge: 30 })
  })
})

// the user chose proposal C (2026-10-22): no coloured rows nor price dots, one
// «Senyals» column of icons with their meaning on hover, and the price changes
// in words under the price
describe('the orders list', () => {
  const { isLate, signalsOf, discountsOf, isFutureWeek } = OrdersTable.methods
  const vm = { money: v => `${String(v).replace('.', ',')} €`, isLate, isFutureWeek }
  const keys = o => signalsOf.call(vm, o).map(s => s.key)

  it('gives every mark of an order as an icon, alerts first', () => {
    expect(keys({ late_order: true, late_surcharge: 25, refrigerated: true, transfer: true, fragile: true }))
      .toEqual(['express', 'cold', 'transfer', 'fragile'])
    expect(keys({ is_collection_order: true, late_pickup: true })).toEqual(['late-pickup', 'collection'])
    expect(keys({ last_mile: true })).toEqual(['last-mile'])
    expect(keys({})).toEqual([])
  })

  it('says what each icon means', () => {
    const [express] = signalsOf.call(vm, { late_order: true, late_surcharge: 25 })
    expect(express).toMatchObject({ kind: 'is-alert', label: "Comanda express: informada fora de l'hora límit (recàrrec +25 %)" })
    expect(signalsOf.call(vm, { is_collection_order: true, late_pickup: true })[0].label).toBe('Inclou recollides informades tard')
  })

  it('marks next week with an icon, not a grey row', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T10:00:00'))
    expect(keys({ estimated_delivery_date: '2026-10-13' })).toEqual(['next-week'])
    expect(keys({ estimated_delivery_date: '2026-10-09' })).toEqual([])
    vi.useRealTimers()
  })

  // the user (2026-10-22): «Entrega» repeats the snowflake of «Senyals»
  it('has no «Entrega» nor «Lliurada» column: «Senyals» edits the type and filters by every signal', () => {
    const signalLegend = OrdersTable.computed.signalLegend.call({})
    const cols = OrdersTable.computed.columns.call({ deliveryTypes: [{ name: 'Normal' }, { name: 'Refrigerada' }], pickups: [], signalLegend })
    expect(cols.map(c => c.key)).not.toContain('delivery_type.name')
    expect(cols.map(c => c.key)).not.toContain('delivery_date')
    const signals = cols.find(c => c.key === 'signals')
    expect(signals).toMatchObject({ edit: 'delivery_type', filterKey: 'signal' })
    expect(signals.options().map(o => o.value)).toEqual(signalLegend.map(sg => sg.key))
    expect(signals.options().map(o => o.value)).toEqual(expect.arrayContaining(['incidence', 'last-mile', 'cold']))
  })

  it('shows an incidence: red while open, plain once closed', () => {
    const open = OrdersTable.methods.signalsOf.call({ isFutureWeek: () => false }, { incidences: [{ id: 1, state: 'open' }, { id: 2, state: 'closed' }] })
    expect(open[0]).toMatchObject({ key: 'incidence', kind: 'is-alert', label: '1 incidència oberta' })
    const closed = OrdersTable.methods.signalsOf.call({ isFutureWeek: () => false }, { incidences: [{ id: 2, state: 'closed' }] })
    expect(closed[0]).toMatchObject({ key: 'incidence', kind: 'is-info', label: 'Incidència tancada' })
  })

  it('has no «Última milla» status tab: it is a signal', () => {
    expect(OrdersTable.computed.statusTabs.call({}).map(s => s.id)).not.toContain('lastmile')
  })

  it('paints only the alerts (late order or pickup)', () => {
    expect(isLate({ late_order: true })).toBe(true)
    expect(isLate({ is_collection_order: true, late_pickup: true })).toBe(true)
    expect(isLate({ late_order: false, late_pickup: false })).toBe(false)
  })

  it('writes the surcharge and the discounts under the price', () => {
    const mods = discountsOf.call(vm, { price: 10, finalPrice: 11.25, late_order: true, late_surcharge: 25, multidelivery_discount: 10, volume_discount: 2 })
    expect(mods.map(d => d.text)).toEqual(['+25 %', '−10 %', '−2 €'])
    expect(mods[0].title).toBe('Recàrrec express (+25 %)')
    expect(discountsOf.call(vm, { price: 10, finalPrice: 10, late_order: false, late_surcharge: 0 })).toEqual([])
    // +25 % and −20 % leave the price as it was: both are still said
    expect(discountsOf.call(vm, { price: 10, finalPrice: 10, late_order: true, late_surcharge: 25, multidelivery_discount: 20 }).map(d => d.text))
      .toEqual(['+25 %', '−20 %'])
  })
})
