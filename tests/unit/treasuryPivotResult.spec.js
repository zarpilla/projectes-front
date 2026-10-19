// issues/197: the Tresoreria pivot «Per projecte» counted the «Saldo real
// ajustat» rows in «Resultat», so the year result and the grand total were off
// by the adjustments (−737.482,38 € on Resilience 2026). They only move the
// running balance: Resultat must be Cobraments + Pagaments, as the monthly table.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'

const rows = TresoreriaTable.computed.monthlySummaryForPivot.call({
  monthlySummary: [
    { type: 'Factura', project_name: 'P', total_amount: 1000 },
    { type: 'Factura rebuda', project_name: 'P', total_amount: -400 },
    { type: 'Saldo real ajustat', project_name: '', total_amount: -737482.38, is_real_balance_adjustment: true },
    { type: 'Saldo bancari', project_name: '', total_amount: 50, is_balance_annotation: true }
  ]
})
const sum = field => rows.reduce((s, r) => s + r[field], 0)

describe('Tresoreria pivot (issues/197)', () => {
  it('leaves balance adjustments out of «Resultat»', () => {
    expect(sum('total_amount')).toBe(600)
    expect(sum('total_amount')).toBe(sum('total_incomes') + sum('total_expenses'))
  })
})
