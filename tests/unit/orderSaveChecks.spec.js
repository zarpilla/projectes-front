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

  it('checks slot 2\'s end time against slot 1\'s end (existing behaviour)', async () => {
    const base = {
      units: 1, kilograms: 1, contact_trade_name: 'B', contact_city: 'G', contact_nif: 'N', contact_phone: 'P',
      contact_address: 'A', contact_postcode: 'C', contact_time_slot_1_ini: 8, contact_time_slot_1_end: 12,
      contact_time_slot_2_ini: 15, contact_time_slot_2_end: null, id: 123, owner: 5, route: 3, contact: 10, pickup: 1
    }
    const r = await submitResult({ form: base, collectionPoints: null, collectionPickupRoutes: [] })
    expect(r.message).not.toBe("Error. Cal indicar l'hora de finalització del tram horari 2")
  })
})
