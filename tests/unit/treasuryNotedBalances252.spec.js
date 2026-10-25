// issues/252 (open point): the monthly table of Tresoreria left out every
// «Saldo real ajustat» / «Saldo bancari». One noted during the year was in the
// seed of «Des d'avui» («Saldo avui») but never reached «Des de l'inici d'any»,
// so the two modes ended the year apart. Now the noted balances after the
// seed's day move the running saldo; those of the seed's day are in the seed.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'

const { monthlySummaryTotal } = TresoreriaTable.computed
const { notedBalanceDelta } = TresoreriaTable.methods

// Rows as the backend sends them: 1/1 «Saldo real» 1.000 (seed of «Inici
// d'any»), −200 in February, a «Saldo real» of 5.000 on 10 March (+4.200),
// −300 in April, «Avui» on 1 May (its balance 4.700), then +100 in June and a
// «Saldo bancari» of 4.000 on 20 June (−800).
const rows = [
  { ym: '202601', datef: '20260101', total_amount: 1000, balance_delta: 1000, is_real_balance_adjustment: true },
  { ym: '202602', datef: '20260210', total_amount: -200 },
  { ym: '202603', datef: '20260310', total_amount: 4200, balance_delta: 4200, is_real_balance_adjustment: true },
  { ym: '202604', datef: '20260415', total_amount: -300 },
  { ym: '202606', datef: '20260601', total_amount: 100 },
  { ym: '202606', datef: '20260620', total_amount: 0, balance_delta: -800, is_balance_annotation: true },
  { ym: '202612', datef: '20261215', total_amount: 50 }
]

function table (view, seed, seedDate) {
  const ctx = { view, selectedYear: '2026', todaySubTotal: seed, seedDate }
  ctx.notedBalanceDelta = r => notedBalanceDelta.call(ctx, r)
  ctx.monthlySummary = rows.filter(r => r.datef >= seedDate)
  return monthlySummaryTotal.call(ctx)
}

describe('Tresoreria noted balances in the monthly saldo (issues/252)', () => {
  const year = table('year', 1000, '20260101')
  const today = table('today', 4700, '20260501')

  it('applies a «Saldo real» noted during the year in «Des de l\'inici d\'any»', () => {
    expect(year.find(m => m.ym === '202603').subtotal).toBe(5000)
    expect(year.find(m => m.ym === '202604').subtotal).toBe(4700)
  })

  it('does not count the seed day\'s noted balance twice', () => {
    expect(year.find(m => m.ym === '202601').subtotal).toBe(1000)
  })

  it('applies a «Saldo bancari» after today in both modes', () => {
    expect(year.find(m => m.ym === '202606').subtotal).toBe(4000)
    expect(today.find(m => m.ym === '202606').subtotal).toBe(4000)
  })

  it('both modes reach the same «Saldo a 31/12»', () => {
    expect(year.find(m => m.ym === '202600').subtotal).toBe(4050)
    expect(today.find(m => m.ym === '202600').subtotal).toBe(4050)
  })

  it('keeps noted balances out of «Resultat»', () => {
    expect(year.find(m => m.ym === '202603').total_amount).toBe(0)
    expect(year.find(m => m.ym === '202603').balance_adjustment).toBe(4200)
  })
})
