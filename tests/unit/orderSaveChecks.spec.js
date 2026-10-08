// The checks OrdersForm.submit runs before saving an order: each one shows an
// error and stops. Recorded from submit itself before the rules moved to
// src/domain/orderValidation.js (orderSaveProblem).
import { describe, it, expect, vi } from 'vitest'

const api = { get: vi.fn(async () => ({ data: { id: 5 } })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import OrdersForm from '@/components/OrdersForm.vue'

function prng (seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// valid orders with one or two fields broken, so every check gets exercised
const VALID = {
  id: 123, status: 'pending', owner: 5, route: 3, contact: 10, pickup: 1, is_collection_order: false,
  units: 2, kilograms: 12.5, contact_trade_name: 'Botiga', contact_city: 'Girona', contact_nif: 'B1',
  contact_phone: '600', contact_address: 'C/ Major', contact_postcode: '17001', collection_point: 7,
  collection_pickup_route: 4, contact_time_slot_1_ini: 8, contact_time_slot_1_end: 12,
  contact_time_slot_2_ini: 15, contact_time_slot_2_end: 19
}
const BREAK = {
  id: [null], owner: [null], route: [null], contact: [null], pickup: [null], is_collection_order: [true],
  units: [0, -1], kilograms: [0], contact_trade_name: [''], contact_city: [''], contact_nif: [''],
  contact_phone: [''], contact_address: [''], contact_postcode: [''], collection_point: [null],
  collection_pickup_route: [null], contact_time_slot_1_ini: [null, 13], contact_time_slot_1_end: [null, 9, 10],
  contact_time_slot_2_ini: [null, 20], contact_time_slot_2_end: [null, 16]
}

function cases () {
  const rnd = prng(777)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const keys = Object.keys(BREAK)
  const out = []
  for (let i = 0; i < 300; i++) {
    const form = { ...VALID }
    const n = i % 10 === 0 ? 0 : 1 + Math.floor(rnd() * 2)
    for (let k = 0; k < n; k++) {
      const key = pick(keys)
      form[key] = pick(BREAK[key])
    }
    out.push({
      form,
      collectionPoints: pick([null, [], [{ id: 7 }]]),
      collectionPickupRoutes: pick([[], [{ id: 4 }]])
    })
  }
  return out
}

async function submitResult (c) {
  const messages = []
  let wrote = false
  const fail = async () => { wrote = true; throw new Error('STOP') }
  api.put.mockImplementation(fail)
  api.post.mockImplementation(fail)
  const vm = {
    ...c,
    form: { ...c.form },
    permissions: [],
    isLoading: false,
    validateEstimateDateDayOfWeek: () => true,
    $buefy: { snackbar: { open: o => messages.push(o.message) }, toast: { open: o => messages.push(o.message) }, dialog: { confirm: () => {} } }
  }
  for (const [name, fn] of Object.entries(OrdersForm.methods)) {
    if (!(name in vm)) vm[name] = fn.bind(vm)
  }
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  await OrdersForm.methods.submit.call(vm, false).catch(() => {})
  errorLog.mockRestore(); log.mockRestore()
  // the first message is what the user sees; reaching a write means all checks passed
  return { message: messages[0] || null, wrote }
}

describe('OrdersForm save checks', () => {
  it('matches the recorded outcome of 300 generated orders', async () => {
    const results = []
    for (const c of cases()) results.push(await submitResult(c))
    expect(results).toMatchSnapshot()
  })

  it('stops an order with zero boxes', async () => {
    const r = await submitResult({ form: { units: 0, kilograms: 5 }, collectionPoints: null, collectionPickupRoutes: [] })
    expect(r).toEqual({ message: 'Error. Els valors de caixes i kilos han de ser positius', wrote: false })
  })

  // issues/004: the check looked at slot 1's end, so a missing slot 2 end got
  // the "start later than end" message (null) or none at all (undefined)
  it('asks for slot 2\'s end time when it has a start but no end', async () => {
    const base = {
      units: 1, kilograms: 1, contact_trade_name: 'B', contact_city: 'G', contact_nif: 'N', contact_phone: 'P',
      contact_address: 'A', contact_postcode: 'C', contact_time_slot_1_ini: 8, contact_time_slot_1_end: 12,
      contact_time_slot_2_ini: 15, id: 123, owner: 5, route: 3, contact: 10, pickup: 1
    }
    for (const end of [null, undefined, '']) {
      const r = await submitResult({ form: { ...base, contact_time_slot_2_end: end }, collectionPoints: null, collectionPickupRoutes: [] })
      expect(r, `slot 2 end ${JSON.stringify(end)}`).toEqual({ message: "Error. Cal indicar l'hora de finalització del tram horari 2", wrote: false })
    }
    const complete = await submitResult({ form: { ...base, contact_time_slot_2_end: 19 }, collectionPoints: null, collectionPickupRoutes: [] })
    // passing every check means reaching the save (which the harness fails on purpose)
    expect(complete.wrote).toBe(true)
    const none = await submitResult({ form: { ...base, contact_time_slot_2_ini: null, contact_time_slot_2_end: null }, collectionPoints: null, collectionPickupRoutes: [] })
    expect(none.wrote).toBe(true)
  })

  // issues/005: at least one slot must last 3 hours; a short slot 1 with no
  // slot 2 used to pass
  it('needs at least one time slot of 3 hours or more', async () => {
    const base = {
      units: 1, kilograms: 1, contact_trade_name: 'B', contact_city: 'G', contact_nif: 'N', contact_phone: 'P',
      contact_address: 'A', contact_postcode: 'C', id: 123, owner: 5, route: 3, contact: 10, pickup: 1
    }
    const save = slots => submitResult({ form: { ...base, ...slots }, collectionPoints: null, collectionPickupRoutes: [] })
    const short = { message: 'Error. El tram horari ha de ser mínim de 3 hores', wrote: false }
    const slots = (a, b, c, d) => ({
      contact_time_slot_1_ini: a, contact_time_slot_1_end: b, contact_time_slot_2_ini: c, contact_time_slot_2_end: d
    })
    expect(await save(slots(9, 11, null, null))).toEqual(short)
    expect(await save(slots(9, 11, undefined, undefined))).toEqual(short)
    expect(await save(slots(9, 11, 15, 17))).toEqual(short)
    expect((await save(slots(9, 12, null, null))).wrote).toBe(true)
    expect((await save(slots(9, 11, 15, 18))).wrote).toBe(true)
    expect((await save(slots(8, 12, 15, 16))).wrote).toBe(true)
  })
})
