// A project's documents list and the documents not yet assigned to a budget
// line (ProjectForm's `documents` / `unassignedDocuments`). Recorded from the
// component before the logic moved to src/domain/projectDocuments.js.
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

const KINDS = ['emitted_invoices', 'received_grants', 'received_invoices', 'tickets', 'diets', 'received_incomes', 'received_expenses']
const DOCUMENT_TYPES = [{ id: 1, name: 'Nòmina' }, { id: 2, name: 'Quota' }]

function projects () {
  const rnd = prng(5150)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const out = []
  for (let p = 0; p < 200; p++) {
    const form = {}
    let id = 1
    for (const kind of KINDS) {
      if (rnd() < 0.15) continue // field missing on the project
      form[kind] = Array.from({ length: Math.floor(rnd() * 4) }, () => ({
        id: id++,
        code: `${kind}-${id}`,
        emitted: pick([undefined, '2026-01-10', '2026-01-10', '2026-03-02', '2025-12-31']),
        document_type: pick([undefined, 1, 2, 3])
      }))
    }
    const ref = kind => (form[kind] && form[kind].length && rnd() < 0.5) ? { id: pick(form[kind]).id } : pick([undefined, null, {}])
    form.project_phases = rnd() < 0.1 ? undefined : Array.from({ length: Math.floor(rnd() * 3) }, () => ({
      incomes: Array.from({ length: Math.floor(rnd() * 3) }, () => ({
        invoice: ref('emitted_invoices'), grant: ref('received_grants'), income: ref('received_incomes')
      })),
      expenses: Array.from({ length: Math.floor(rnd() * 3) }, () => ({
        invoice: ref('received_invoices'), ticket: ref('tickets'), diet: ref('diets'),
        grant: ref('received_grants'), expense: ref('received_expenses')
      }))
    }))
    out.push(form)
  }
  return out
}

const run = form => {
  const vm = { form, documentTypes: DOCUMENT_TYPES }
  return {
    documents: ProjectForm.computed.documents.call(vm),
    unassigned: ProjectForm.computed.unassignedDocuments.call(vm)
  }
}

describe('ProjectForm documents', () => {
  it('matches the recorded lists of 200 generated projects', () => {
    expect(projects().map(run)).toMatchSnapshot()
  })

  it('lists documents by date with the sign of their kind', () => {
    const { documents } = run({
      received_invoices: [{ id: 1, emitted: '2026-02-01' }],
      emitted_invoices: [{ id: 2, emitted: '2026-01-01' }],
      received_expenses: [{ id: 3, emitted: '2026-03-01', document_type: 1 }]
    })
    expect(documents.map(d => [d.docType, d.docTypeDesc, d.multiplier])).toEqual([
      ['emitted_invoices', 'Factura emesa', 1],
      ['received_invoices', 'Factura rebuda', -1],
      ['received_expense', 'Nòmina', -1]
    ])
  })

  it('leaves out documents already assigned to a budget line', () => {
    const { unassigned } = run({
      emitted_invoices: [{ id: 1 }, { id: 2 }],
      received_grants: [{ id: 3 }],
      project_phases: [{ incomes: [{ invoice: { id: 1 } }], expenses: [{ grant: { id: 3 } }] }]
    })
    expect(unassigned).toEqual([{ id: 2, type: 'Factura emesa' }])
  })
})
