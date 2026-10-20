// issues/254: the projects list .ods had no non-deductible VAT column, so its
// figures didn't add up to the result it exported: INCIDÈNCIA SOCIOPOLÍTICA
// 10.627,66 − 6.140,80 − 21.632,10 = −17.145,24 against −17.171,21 (25,97 of VAT);
// the estimated result was out by 41,82.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import Home from '@/views/Home.vue'

const project = {
  id: 1, name: 'INCIDÈNCIA SOCIOPOLÍTICA', project_state: { id: 1, name: 'Actiu' },
  total_incomes: 13995.2, total_expenses: 6290.8, total_estimated_hours_price: 24578.31,
  total_estimated_expenses_vat: 41.82, incomes_expenses: -16915.73,
  total_real_incomes: 10627.66, total_real_expenses: 6140.8, total_real_hours_price: 21632.1,
  total_real_expenses_vat: 25.97, total_real_incomes_expenses: -17171.21
}

describe('projects list export (issues/254)', () => {
  it('has the non-deductible VAT, so the columns add up to the result', () => {
    const [row] = Home.computed.projectsCSV.call({ projects: [project] })
    const est = row.estimated_incomes - row.estimated_expenses - row.estimated_hours_price - row.estimated_expenses_vat
    const real = row.real_incomes - row.real_expenses - row.real_hours_price - row.real_expenses_vat
    expect(est).toBeCloseTo(row.estimated_result, 2)
    expect(real).toBeCloseTo(row.real_result, 2)
  })
})
