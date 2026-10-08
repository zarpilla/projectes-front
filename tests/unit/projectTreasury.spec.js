// A project's treasury (ProjectForm): every budget line and annotation with
// its sign, the paid documents, and the pending/done sums. Recorded from the
// component before the logic moved to src/domain/projectTreasury.js.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectForm from '@/views/ProjectForm.vue'

function prng (seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function projects () {
  const rnd = prng(31337)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const amount = () => pick([undefined, 0, Math.round(rnd() * 1000000) / 100])
  const rel = () => (rnd() < 0.5 ? { id: 1 + Math.floor(rnd() * 50) } : undefined)
  const out = []
  for (let p = 0; p < 200; p++) {
    const form = {
      project_phases: rnd() < 0.1 ? undefined : Array.from({ length: Math.floor(rnd() * 3) }, () => ({
        incomes: Array.from({ length: Math.floor(rnd() * 4) }, () => ({
          paid: pick([undefined, false, true]), total_amount: amount(), invoice: rel(), grant: rel(), income: rel()
        })),
        expenses: Array.from({ length: Math.floor(rnd() * 4) }, () => ({
          paid: pick([undefined, false, true]), total_amount: amount(), invoice: rel(), ticket: rel(), diet: rel(), expense: rel()
        }))
      })),
      treasury_annotations: rnd() < 0.5 ? undefined : Array.from({ length: Math.floor(rnd() * 3) }, () => ({
        concept: 'Previsió', total: amount(), paid: pick([undefined, true])
      }))
    }
    out.push(form)
  }
  return out
}

const run = form => {
  const c = ProjectForm.computed
  const vm = { form }
  Object.defineProperty(vm, 'treasury', { get: () => c.treasury.call(vm) })
  return {
    treasury: c.treasury.call(vm),
    done: c.treasuryDone.call(vm),
    incomesPending: c.treasuryIncomesPending.call(vm),
    expensesPending: c.treasuryExpensesPending.call(vm),
    incomesDone: c.treasuryIncomesDone.call(vm),
    expensesDone: c.treasuryExpensesDone.call(vm)
  }
}

describe('ProjectForm treasury', () => {
  it('matches the recorded treasury of 200 generated projects', () => {
    expect(projects().map(run)).toMatchSnapshot()
  })

  it('splits pending and done by sign', () => {
    const r = run({
      project_phases: [{
        incomes: [{ paid: true, total_amount: 100, invoice: { id: 1 } }, { paid: false, total_amount: 40 }],
        expenses: [{ paid: true, total_amount: 30, ticket: { id: 2 } }, { total_amount: 5 }]
      }],
      treasury_annotations: [{ concept: 'Previsió', total: 7 }]
    })
    expect([r.incomesPending, r.expensesPending, r.incomesDone, r.expensesDone]).toEqual([47, 5, 100, 30])
    expect(r.done).toEqual([
      { docType: 'emitted_invoices', id: 1, multiplier: 1 },
      { docType: 'tickets', id: 2, multiplier: -1 }
    ])
  })
})
