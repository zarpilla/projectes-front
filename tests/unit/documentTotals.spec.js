// Invoice/expense totals, as DocumentForm shows them and saves them.
// The recorded values were produced by DocumentForm's computed properties
// before the calculation moved to src/domain/documentTotals.js, and recorded
// again when lines started being rounded to cents (issues/073); they must
// stay identical.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DocumentForm from '@/components/DocumentForm.vue'

// small deterministic PRNG (mulberry32), so the dataset is the same everywhere
function prng (seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function dataset () {
  const rnd = prng(20261008)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const docs = []
  for (let d = 0; d < 500; d++) {
    const lines = []
    const n = 1 + Math.floor(rnd() * 6)
    for (let i = 0; i < n; i++) {
      const asString = rnd() < 0.3 // b-input values arrive as strings
      const quantity = pick([1, 2, 3, 0.5, 1.25, 7, 10, 0])
      const base = Math.round(rnd() * 100000) / 100
      lines.push({
        quantity: asString ? String(quantity) : quantity,
        base: asString ? String(base) : base,
        discount: pick([undefined, null, 0, 5, 10, 12.5, 100]),
        vat: pick([0, 4, 10, 21]),
        irpf: pick([0, 7, 15, 19])
      })
    }
    docs.push(lines)
  }
  return docs
}

const totalsOf = lines => {
  const vm = { form: { lines } }
  const c = DocumentForm.computed
  for (const k of ['totalBase', 'totalVat', 'totalIrpf', 'totalBaseWithoutDiscount']) {
    Object.defineProperty(vm, k, { get: () => c[k].call(vm), configurable: true })
  }
  return {
    base: c.totalBase.call(vm),
    vat: c.totalVat.call(vm),
    irpf: c.totalIrpf.call(vm),
    total: c.total.call(vm),
    hasDiscount: c.hasDiscount.call(vm),
    baseWithoutDiscount: c.totalBaseWithoutDiscount.call(vm),
    discount: c.totalDiscount.call(vm)
  }
}

describe('DocumentForm totals', () => {
  it('matches the recorded totals of 500 generated documents exactly', () => {
    expect(dataset().map(totalsOf)).toMatchSnapshot()
  })

  it('computes a readable example', () => {
    const t = totalsOf([
      { quantity: 3, base: 12.5, discount: 10, vat: 21, irpf: 15 },
      { quantity: '2', base: '10', discount: null, vat: 10, irpf: 0 }
    ])
    // each line rounded to cents before adding them up (issues/073)
    expect(t.base).toBe(53.75)
    expect(t.vat).toBe(9.09) // 7.09 + 2
    expect(t.irpf).toBe(-5.06)
    expect(t.total).toBe(57.78)
    expect(t.hasDiscount).toBe(true)
    expect(t.baseWithoutDiscount).toBeCloseTo(57.5)
    expect(t.discount).toBeCloseTo(3.75)
  })

  it('is zero for a document without lines', () => {
    expect(totalsOf([])).toEqual({ base: 0, vat: 0, irpf: -0, total: 0, hasDiscount: false, baseWithoutDiscount: 0, discount: 0 })
  })
})

// issues/073: emitted invoice 642 had a base of 2.452,41 while its lines, as
// shown, added up to 2.452,40
it('gives a base equal to the sum of the lines as shown', async () => {
  const { totalBase, lineBase } = await import('@/domain/documentTotals.js')
  const lines = [1, 2, 3].map(() => ({ quantity: 1, base: 2.004, vat: 21, irpf: 0 }))
  expect(lines.map(lineBase)).toEqual([2, 2, 2])
  expect(totalBase(lines)).toBe(6)
})

describe('byRate', () => {
  it('splits VAT by rate and adds up to totalVat', async () => {
    const { byRate, totalVat } = await import('@/domain/documentTotals.js')
    const lines = [
      { quantity: 1, base: 1044, discount: 0, vat: 0, irpf: 0 },
      { quantity: '1', base: '1099.25', discount: 0, vat: 10, irpf: 0 },
      { quantity: 2, base: 50, discount: 10, vat: 21, irpf: 15 },
      { quantity: 1, base: 30, discount: 0, vat: 21, irpf: 0 }
    ]
    const vat = byRate(lines)
    expect(vat.map(g => [g.rate, Math.round(g.base * 100) / 100])).toEqual([[0, 1044], [10, 1099.25], [21, 120]])
    expect(vat.reduce((a, g) => a + g.amount, 0)).toBeCloseTo(totalVat(lines), 10)
    expect(byRate(lines, 'irpf').map(g => g.rate)).toEqual([0, 15])
  })
})
